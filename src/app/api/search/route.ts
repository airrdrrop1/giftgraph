import { NextRequest, NextResponse } from "next/server";
import { qlooGet, shortType, entityImage, type QlooEntity } from "@/lib/qloo";

/**
 * GET /api/search?q=<text>
 * Free-text entity resolution → simplified candidates for seed picking.
 * Response: { results: [{ id, name, type, image?, disambiguation? }] }
 * 400 when q is missing or shorter than 2 characters.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Query param 'q' is required (minimum 2 characters)." },
      { status: 400 },
    );
  }

  const res = await qlooGet(`/search?${new URLSearchParams({ query: q }).toString()}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  const results: QlooEntity[] = res.data?.results ?? [];
  return NextResponse.json({
    results: results.slice(0, 10).map((e) => ({
      id: e.entity_id,
      name: e.name,
      type: shortType(e.types?.[0]),
      image: entityImage(e),
      disambiguation: e.disambiguation,
    })),
  });
}
