/**
 * Recommendation engine shared by /api/recommend and /api/refine.
 *
 * Strategy: fan out in parallel GET /v2/insights per output category with the
 * SAME seed signal (signal.interests.entities), then merge, dedupe, tier and
 * annotate. Cross-domain transfer (music → book → place → brand) is the point.
 *
 * Honesty rules:
 * - NEVER expose raw affinity decimals — only relative tiers per category:
 *   "Top match" (rank 0), "Strong match" (ranks 1–2), "Wildcard" (rest).
 * - Never fabricate data: category errors surface in meta.errors, and a
 *   category with zero results returns an empty list, not placeholders.
 *
 * BUDGET RULE (deterministic, local — Qloo returns no prices, so we map
 * budget to category priority instead of dollar filtering):
 *   budget <= 25        → hard-exclude "brand" and "place" (typically the
 *                         priciest gift types); keep book / podcast / movie.
 *   25 < budget <= 100  → soft priority: book, podcast, movie before
 *                         brand, place (category order only).
 *   budget > 100 / null → no restrictions.
 * The rule applied is always echoed in meta.budgetRule so the UI can show it.
 */

import {
  qlooGet,
  shortType,
  entityImage,
  entityAffinity,
  tagNames,
  type QlooEntity,
} from "./qloo";
import { buildReason, pickAnchorTag, type Tier } from "./reasons";

export const CATEGORY_TYPES = ["place", "book", "brand", "movie", "podcast"] as const;
export type Category = (typeof CATEGORY_TYPES)[number];

const urnFor = (c: Category) => `urn:entity:${c}`;

export interface RecommendInput {
  /** Qloo entity IDs, e.g. from /api/search */
  seeds: string[];
  /** Optional id → display name map so reasons can name the seed without extra lookups */
  seedNames?: Record<string, string>;
  occasion?: string;
  /** Dollar budget (number) or null for no budget */
  budget?: number | null;
  /** City for the place (experience) call only, e.g. "Kyoto" */
  city?: string;
  /** Entity IDs to exclude via filter.exclude.entities (thumbs-down) */
  exclude?: string[];
  /** Categories to drop entirely (from the refine parser or caller) */
  excludedCategories?: Category[];
  /** Soft sort: these categories appear first in categoryOrder */
  priorityCategories?: Category[];
  /** Max picks per category (default 8) */
  limitPerCategory?: number;
  /** IDs already shown — skipped when pulling replacements */
  previousIds?: string[];
}

export interface GiftPick {
  id: string;
  name: string;
  /** short type from Qloo, e.g. "book" */
  type: string;
  category: Category;
  image?: string;
  tier: Tier;
  /** deterministic, data-anchored; see lib/reasons.ts */
  reason: string;
  reasonSeedId?: string;
  reasonSeedName?: string;
  popularity?: number;
  tags: string[];
}

export interface RecommendMeta {
  seeds: number;
  occasion: string | null;
  budget: number | null;
  city: string | null;
  budgetRule: string;
  excludedCategories: Category[];
  /** per-category Qloo failures, if any */
  errors: Record<string, string>;
  totalPicks: number;
}

export interface RecommendResult {
  ok: boolean;
  error?: string;
  status?: number;
  categories?: Record<Category, GiftPick[]>;
  categoryOrder?: Category[];
  meta?: RecommendMeta;
}

export function applyBudgetRule(budget: number | null | undefined): {
  excludedCategories: Category[];
  priorityCategories: Category[];
  note: string;
} {
  if (budget == null || budget > 100) {
    return {
      excludedCategories: [],
      priorityCategories: [],
      note: "budget>100 or unset: no category restrictions",
    };
  }
  if (budget <= 25) {
    return {
      excludedCategories: ["brand", "place"],
      priorityCategories: ["book", "podcast", "movie"],
      note: "budget<=25: brand & place excluded (typically priciest gift types); book/podcast/movie kept",
    };
  }
  return {
    excludedCategories: [],
    priorityCategories: ["book", "podcast", "movie"],
    note: "25<budget<=100: soft priority book/podcast/movie before brand/place (order only)",
  };
}

function toPick(e: QlooEntity, category: Category): GiftPick {
  return {
    id: e.entity_id,
    name: e.name,
    type: shortType(e.subtype ?? e.types?.[0]),
    category,
    image: entityImage(e),
    tier: "Wildcard", // assigned by rank after merge
    reason: "",
    popularity: e.popularity,
    tags: tagNames(e).slice(0, 6),
  };
}

export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  const seeds = [...new Set((input.seeds ?? []).filter(Boolean))];
  if (seeds.length === 0) {
    return { ok: false, error: "seeds must be a non-empty array of entity IDs", status: 400 };
  }

  const budgetRule = applyBudgetRule(input.budget);
  const excludedCategories = [
    ...new Set<Category>([...budgetRule.excludedCategories, ...(input.excludedCategories ?? [])]),
  ];
  const limit = input.limitPerCategory ?? 8;
  const seedParam = seeds.join(",");
  const excludeParam = [...new Set((input.exclude ?? []).filter(Boolean))].join(",");
  const previous = new Set(input.previousIds ?? []);

  const categories = CATEGORY_TYPES.filter((c) => !excludedCategories.includes(c));

  // Fan out in parallel — one /v2/insights call per category, same seed signal.
  const calls = await Promise.all(
    categories.map(async (cat) => {
      const params = new URLSearchParams({
        "signal.interests.entities": seedParam,
        "filter.type": urnFor(cat),
        // Over-fetch: exclusions and previousIds filtering happen client-of-Qloo.
        take: String(Math.max(limit * 2, 8)),
      });
      if (cat === "place" && input.city) {
        params.set("filter.location.query", input.city);
      }
      if (excludeParam) {
        params.set("filter.exclude.entities", excludeParam);
      }
      return { cat, res: await qlooGet(`/v2/insights?${params.toString()}`) };
    }),
  );

  const seedNames = input.seedNames ?? {};
  const seedNameList = seeds.map((id) => seedNames[id]).filter((n) => typeof n === "string");
  // Fallback: if caller gave no names, still run — reasons will honestly say thin.
  const reasonSeedIds = seeds;

  const seen = new Set<string>();
  const out = {} as Record<Category, GiftPick[]>;
  const errors: Record<string, string> = {};

  for (const { cat, res } of calls) {
    if (!res.ok) {
      out[cat] = [];
      errors[cat] = res.error;
      continue;
    }
    const entities: QlooEntity[] = res.data?.results?.entities ?? [];
    const picks: GiftPick[] = [];
    for (const e of entities) {
      if (!e?.entity_id || seen.has(e.entity_id) || previous.has(e.entity_id)) continue;
      seen.add(e.entity_id);
      picks.push(toPick(e, cat));
      if (picks.length >= limit) break;
    }
    // Relative ranking WITHIN the category — never raw affinity decimals.
    picks.forEach((p, i) => {
      const tier: Tier = i === 0 ? "Top match" : i <= 2 ? "Strong match" : "Wildcard";
      p.tier = tier;
      const entity = entities.find((x) => x.entity_id === p.id);
      const r = buildReason({
        entityId: p.id,
        entityName: p.name,
        anchorTag: pickAnchorTag(entity?.tags ?? []),
        affinity: entity ? entityAffinity(entity) : undefined,
        tier,
        seedNames: seedNameList,
        seedIds: reasonSeedIds,
      });
      p.reason = r.text;
      p.reasonSeedId = r.seedId;
      p.reasonSeedName = r.seedName;
    });
    out[cat] = picks;
  }

  // Category order: soft-priority categories first (documented in budget rule).
  const priority = [
    ...new Set<Category>([...budgetRule.priorityCategories, ...(input.priorityCategories ?? [])]),
  ];
  const categoryOrder: Category[] = [
    ...priority.filter((c) => categories.includes(c)),
    ...categories.filter((c) => !priority.includes(c)),
  ];
  const ordered = {} as Record<Category, GiftPick[]>;
  for (const c of categoryOrder) ordered[c] = out[c];

  const totalPicks = Object.values(ordered).reduce((n, arr) => n + arr.length, 0);

  return {
    ok: true,
    categories: ordered,
    categoryOrder,
    meta: {
      seeds: seeds.length,
      occasion: input.occasion ?? null,
      budget: input.budget ?? null,
      city: input.city ?? null,
      budgetRule: budgetRule.note,
      excludedCategories,
      errors,
      totalPicks,
    },
  };
}
