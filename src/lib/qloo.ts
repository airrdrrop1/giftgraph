/**
 * Qloo API client — server-side only.
 *
 * The QLOO_API_KEY never leaves the server: this module is imported exclusively
 * by API route handlers. Frontend code must never import it.
 *
 * Verified response shapes (hackathon base, Oct 24 2026):
 * - GET /search?query=...  → { results: [{ name, entity_id, types: ["urn:entity:artist", ...],
 *     properties: { image: { url }, ... }, popularity, tags: [{ id, name, type }] }] }
 * - GET /v2/insights        → { success: true, results: { entities: [{ name, entity_id,
 *     type: "urn:entity", subtype: "urn:entity:book", properties, popularity,
 *     tags: [...], query: { affinity: 0.0-1.0 } }] } }
 * - GET /v2/trending        → { success: true, results: { trending: [...] } }
 *     Requires filter.type (actor|artist|brand|movie|person|podcast|tv_show),
 *     signal.interests.entities.ids, filter.start_date, filter.end_date.
 */

const QLOO_BASE_URL =
  process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const QLOO_API_KEY = process.env.QLOO_API_KEY || "";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();

export type QlooResult =
  | { ok: true; data: any }
  | { ok: false; error: string; status: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET against the Qloo API with timeout, cache and exponential-backoff retry on 429/5xx.
 * Returns honest errors — never fabricated data.
 */
export async function qlooGet(
  pathAndQuery: string,
  opts: { timeoutMs?: number; retries?: number; cacheable?: boolean } = {},
): Promise<QlooResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES, cacheable = true } = opts;

  if (!QLOO_API_KEY) {
    return { ok: false, error: "QLOO_API_KEY is not configured on the server", status: 500 };
  }

  const url = `${QLOO_BASE_URL}${pathAndQuery}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (cacheable && hit && hit.expiresAt > now) {
    return { ok: true, data: hit.data };
  }

  let lastError = "unknown error";
  let lastStatus = 502;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": QLOO_API_KEY },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastStatus = res.status;
        lastError = `Qloo responded ${res.status}${res.status === 429 ? " (rate limited)" : ""}`;
        // exponential backoff with jitter: ~500ms, 1s, 2s, 4s
        const backoff = Math.min(4000, 500 * 2 ** attempt) + Math.random() * 250;
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          error: `Qloo API error ${res.status}: ${text.slice(0, 200)}`,
          status: res.status,
        };
      }

      const data = await res.json();
      if (cacheable) cache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, data });
      return { ok: true, data };
    } catch (err: any) {
      clearTimeout(timer);
      const timedOut = err?.name === "AbortError";
      lastError = timedOut
        ? `Qloo request timed out after ${timeoutMs}ms`
        : `Network error contacting Qloo: ${err?.message ?? String(err)}`;
      lastStatus = 502;
      if (attempt < retries) {
        const backoff = Math.min(4000, 500 * 2 ** attempt) + Math.random() * 250;
        await sleep(backoff);
      }
    }
  }

  return { ok: false, error: lastError, status: lastStatus };
}

// ---------------------------------------------------------------------------
// Entity shape helpers
// ---------------------------------------------------------------------------

export interface QlooEntity {
  entity_id: string;
  name: string;
  type?: string; // "urn:entity"
  subtype?: string; // e.g. "urn:entity:book" (insights)
  types?: string[]; // e.g. ["urn:entity:artist"] (search)
  properties?: Record<string, any>;
  popularity?: number;
  tags?: Array<{ id?: string; tag_id?: string; name?: string; type?: string }>;
  query?: { affinity?: number };
  disambiguation?: string;
}

/** "urn:entity:book" → "book" */
export function shortType(urn?: string): string {
  if (!urn) return "unknown";
  const m = urn.match(/^urn:entity:(\w+)$/);
  return m ? m[1] : urn;
}

export function entityImage(e: QlooEntity): string | undefined {
  const img = e.properties?.image;
  if (img && typeof img === "object" && typeof img.url === "string") return img.url;
  return undefined;
}

/** Affinity lives at entity.query.affinity (verified live, Oct 24 2026). */
export function entityAffinity(e: QlooEntity): number | undefined {
  return typeof e.query?.affinity === "number" ? e.query.affinity : undefined;
}

export function tagNames(e: QlooEntity): string[] {
  if (!Array.isArray(e.tags)) return [];
  return e.tags
    .map((t) => t?.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
}
