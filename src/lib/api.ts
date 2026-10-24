import type {
  GiftPick,
  IntentEcho,
  ProfileInput,
  RecommendResponse,
  Seed,
} from "./types";

async function okJson(res: Response) {
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function searchSeeds(q: string): Promise<Seed[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const data = await okJson(res);
  return (data.results ?? []) as Seed[];
}

export async function getTrending(): Promise<{ mode: string; seeds: Seed[] }> {
  const res = await fetch("/api/trending");
  return okJson(res);
}

export interface RecommendArgs extends ProfileInput {
  seeds: Seed[];
  exclude?: string[];
  excludedCategories?: string[];
  priorityCategories?: string[];
  limitPerCategory?: number;
  previousIds?: string[];
}

export async function postRecommend(args: RecommendArgs): Promise<RecommendResponse> {
  const body = {
    seeds: args.seeds.map((s) => s.id),
    seedNames: Object.fromEntries(args.seeds.map((s) => [s.id, s.name])),
    occasion: args.occasion || undefined,
    budget: args.budget,
    city: args.city.trim() || undefined,
    exclude: args.exclude?.length ? args.exclude : undefined,
    excludedCategories: args.excludedCategories?.length ? args.excludedCategories : undefined,
    priorityCategories: args.priorityCategories?.length ? args.priorityCategories : undefined,
    limitPerCategory: args.limitPerCategory ?? 3,
    previousIds: args.previousIds?.length ? args.previousIds : undefined,
  };
  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return okJson(res);
}

export interface ExcludeResult extends RecommendResponse {
  excluded: string;
}

export async function postExclude(
  args: RecommendArgs,
  entityId: string,
): Promise<ExcludeResult> {
  const base = await postRecommendBody(args, {
    action: "exclude",
    entityId,
  });
  return base as ExcludeResult;
}

async function postRecommendBody(args: RecommendArgs, extra: object) {
  const recommend = {
    seeds: args.seeds.map((s) => s.id),
    seedNames: Object.fromEntries(args.seeds.map((s) => [s.id, s.name])),
    occasion: args.occasion || undefined,
    budget: args.budget,
    city: args.city.trim() || undefined,
    exclude: args.exclude?.length ? args.exclude : undefined,
    excludedCategories: args.excludedCategories?.length ? args.excludedCategories : undefined,
    priorityCategories: args.priorityCategories?.length ? args.priorityCategories : undefined,
    limitPerCategory: args.limitPerCategory ?? 3,
    previousIds: args.previousIds?.length ? args.previousIds : undefined,
  };
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...extra, recommend }),
  });
  return okJson(res);
}

export async function postInstruction(
  args: RecommendArgs,
  text: string,
): Promise<RecommendResponse & { intent: IntentEcho }> {
  const profile = {
    seeds: args.seeds.map((s) => s.id),
    seedNames: Object.fromEntries(args.seeds.map((s) => [s.id, s.name])),
    occasion: args.occasion || undefined,
    budget: args.budget,
    city: args.city.trim() || undefined,
    exclude: args.exclude?.length ? args.exclude : undefined,
    excludedCategories: args.excludedCategories?.length ? args.excludedCategories : undefined,
    priorityCategories: args.priorityCategories?.length ? args.priorityCategories : undefined,
  };
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "instruction", text, profile }),
  });
  return okJson(res);
}

export async function postAddSeed(
  args: RecommendArgs,
  entityId: string,
): Promise<RecommendResponse & { seeds: string[] }> {
  const base = await postRecommendBody(args, {
    action: "addSeed",
    entityId,
  });
  return base as RecommendResponse & { seeds: string[] };
}

export function topTags(categories: RecommendResponse["categories"], n = 5): string[] {
  const counts = new Map<string, number>();
  for (const picks of Object.values(categories)) {
    for (const p of picks as GiftPick[]) {
      for (const t of p.tags ?? []) {
        const key = t.trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([t]) => t);
}
