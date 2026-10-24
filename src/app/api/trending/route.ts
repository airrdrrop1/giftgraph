import { NextResponse } from "next/server";
import { qlooGet, shortType, entityImage, type QlooEntity } from "@/lib/qloo";

/**
 * GET /api/trending
 * Instant seed chips for the landing screen.
 *
 * Tries Qloo /v2/trending (requires filter.type + signal.interests.entities.ids +
 * filter.start_date/end_date; live probes on Oct 24 2026 returned 200 with an
 * empty trending list, so the endpoint may legitimately come back empty).
 *
 * Response: { mode: "live" | "fallback", seeds: [{ id, name, type, image? }] }
 * "fallback" is a curated list of widely-loved entities whose IDs were resolved
 * live via /search at build time — no Qloo call needed at runtime for it.
 */

interface SeedChip {
  id: string;
  name: string;
  type: string;
  image?: string;
}

// Curated fallback seeds — IDs resolved live via /search on Oct 24 2026.
const FALLBACK_SEEDS: SeedChip[] = [
  { id: "E51DB8F2-7A93-4746-A283-E55B5216FDE1", name: "Bon Iver", type: "artist" },
  { id: "C71B6CCE-3F05-4A57-AA84-9D2C2B4D67C5", name: "Wes Anderson", type: "person" },
  { id: "95E19B2C-553A-46A6-AD73-5562AF7124E5", name: "Kyoto", type: "destination" },
  { id: "3C9EEC3A-F4FE-48A4-B89F-97375F292448", name: "Taylor Swift", type: "person" },
  { id: "8359039D-C2BD-40D5-9A0A-60C5A88DC081", name: "Hayao Miyazaki", type: "author" },
];

function lastDays(n: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - n * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export async function GET() {
  const { start, end } = lastDays(90);

  // Probe the live trending endpoint with a valid filter.type + our seeds as signal.
  const params = new URLSearchParams({
    "filter.type": "urn:entity:movie",
    "signal.interests.entities.ids": FALLBACK_SEEDS.map((s) => s.id).join(","),
    "filter.start_date": start,
    "filter.end_date": end,
  });
  const res = await qlooGet(`/v2/trending?${params.toString()}`, { cacheable: true });

  if (res.ok) {
    const trending: QlooEntity[] = res.data?.results?.trending ?? [];
    if (trending.length > 0) {
      const seeds: SeedChip[] = trending.slice(0, 8).map((e) => ({
        id: e.entity_id,
        name: e.name,
        type: shortType(e.subtype ?? e.types?.[0]),
        image: entityImage(e),
      }));
      return NextResponse.json({ mode: "live", seeds });
    }
  }

  // Empty or failed → honest fallback, no fabricated "trending" claims.
  return NextResponse.json({ mode: "fallback", seeds: FALLBACK_SEEDS });
}
