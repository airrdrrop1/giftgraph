import { NextRequest, NextResponse } from "next/server";
import { recommend, type RecommendInput } from "@/lib/recommend";

/**
 * POST /api/recommend
 * Body: {
 *   seeds: string[]               (required, ≥1 Qloo entity IDs)
 *   seedNames?: { [id]: name }     (lets reasons name the seed without extra lookups)
 *   occasion?: string
 *   budget?: number | null
 *   city?: string                  (applied to the place call only)
 *   exclude?: string[]             (entity IDs, via filter.exclude.entities)
 *   excludedCategories?: ("place"|"book"|"brand"|"movie"|"podcast")[]
 *   priorityCategories?: ("place"|"book"|"brand"|"movie"|"podcast")[]
 *   limitPerCategory?: number
 *   previousIds?: string[]
 * }
 * Response: { categories: { place:[], book:[], brand:[], movie:[], podcast:[] },
 *             categoryOrder: [...], meta: {...} }
 * Each pick: { id, name, type, category, image?, tier, reason, reasonSeedId?,
 *              reasonSeedName?, popularity?, tags[] }
 * Tiers are relative ranks within each category — raw affinity is never exposed.
 */
export async function POST(req: NextRequest) {
  let body: RecommendInput;
  try {
    body = (await req.json()) as RecommendInput;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body?.seeds) || body.seeds.length === 0) {
    return NextResponse.json(
      { error: "Body.seeds must be a non-empty array of entity IDs." },
      { status: 400 },
    );
  }

  const result = await recommend(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
  }

  const { ok: _ok, error: _e, status: _s, ...payload } = result;
  return NextResponse.json(payload);
}
