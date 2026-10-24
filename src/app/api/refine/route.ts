import { NextRequest, NextResponse } from "next/server";
import { recommend, type RecommendInput, type Category } from "@/lib/recommend";
import { parseInstruction } from "@/lib/refine";

/**
 * POST /api/refine — the agentic refinement loop.
 *
 * { action: "exclude", entityId, recommend: RecommendInput, previousIds? }
 *   Thumbs-down: re-runs recommend with entityId added to filter.exclude.entities
 *   and returns replacement picks (up to 3 per category, skipping previousIds).
 *
 * { action: "instruction", text, profile: RecommendInput }
 *   Free-text instruction → deterministic regex parser (lib/refine.ts) maps it to
 *   budget / excludedCategories / priorityCategories, then re-runs recommend.
 *   Response echoes the parsed intent: { intent: { budget?, excludedCategories,
 *   priorityCategories?, message }, categories, categoryOrder, meta }.
 *
 * { action: "addSeed", entityId, recommend: RecommendInput }
 *   Appends the seed and re-runs recommend; returns the updated seed list.
 */

type RefineBody =
  | { action: "exclude"; entityId: string; recommend: RecommendInput; previousIds?: string[] }
  | { action: "instruction"; text: string; profile: RecommendInput }
  | { action: "addSeed"; entityId: string; recommend: RecommendInput };

function asAction<A extends RefineBody["action"]>(
  raw: { action?: string },
  action: A,
): Extract<RefineBody, { action: A }> {
  return raw as Extract<RefineBody, { action: A }>;
}

export async function POST(req: NextRequest) {
  let raw: { action?: string };
  try {
    raw = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (raw.action === "exclude") {
    const { entityId, recommend: base, previousIds } = asAction(raw, "exclude");
    if (!entityId || !base?.seeds?.length) {
      return NextResponse.json(
        { error: "exclude requires entityId and recommend.seeds." },
        { status: 400 },
      );
    }
    const result = await recommend({
      ...base,
      exclude: [...(base.exclude ?? []), entityId],
      limitPerCategory: 3,
      previousIds,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    return NextResponse.json({
      action: "exclude",
      excluded: entityId,
      categories: result.categories,
      categoryOrder: result.categoryOrder,
      meta: result.meta,
    });
  }

  if (raw.action === "instruction") {
    const { text, profile } = asAction(raw, "instruction");
    if (!text || !profile?.seeds?.length) {
      return NextResponse.json(
        { error: "instruction requires text and profile.seeds." },
        { status: 400 },
      );
    }
    const intent = parseInstruction(text);
    const merged: RecommendInput = {
      ...profile,
      budget: intent.budget ?? profile.budget,
      excludedCategories: [
        ...new Set<Category>([
          ...(profile.excludedCategories ?? []),
          ...intent.excludedCategories,
        ]),
      ],
      priorityCategories: intent.priorityCategories ?? profile.priorityCategories,
    };
    const result = await recommend(merged);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    return NextResponse.json({
      action: "instruction",
      intent,
      categories: result.categories,
      categoryOrder: result.categoryOrder,
      meta: result.meta,
    });
  }

  if (raw.action === "addSeed") {
    const { entityId, recommend: base } = asAction(raw, "addSeed");
    if (!entityId || !base?.seeds?.length) {
      return NextResponse.json(
        { error: "addSeed requires entityId and recommend.seeds." },
        { status: 400 },
      );
    }
    const seeds = [...new Set([...base.seeds, entityId])];
    const result = await recommend({ ...base, seeds });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    return NextResponse.json({
      action: "addSeed",
      seeds,
      categories: result.categories,
      categoryOrder: result.categoryOrder,
      meta: result.meta,
    });
  }

  return NextResponse.json(
    { error: "Unknown action. Use 'exclude', 'instruction' or 'addSeed'." },
    { status: 400 },
  );
}
