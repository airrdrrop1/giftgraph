/**
 * Deterministic, data-anchored reason generator — NO LLM, deliberate.
 *
 * Each reason MUST be anchored to three real data points:
 *   1. a NAMED seed (the taste input, resolved to a name by the caller),
 *   2. a tag/property name taken from the entity's own Qloo tags,
 *   3. the tier word (Top match / Strong match / Wildcard).
 *
 * Rules:
 * - Never generic fluff, never invent facts ("the author loves X" is forbidden).
 * - Thin signal (affinity below threshold, or no tags) → say so honestly:
 *   "No strong signal from your seeds — try adding broader tastes."
 * - Deterministic: identical inputs always produce the identical reason
 *   (template rotation is keyed on a hash of the entity id, not randomness).
 */

export type Tier = "Top match" | "Strong match" | "Wildcard";

export interface Reason {
  text: string;
  seedName?: string;
  seedId?: string;
  /** true when the signal is too thin to claim a real connection */
  thin: boolean;
}

/** Affinity below this is treated as thin signal. */
export const THIN_AFFINITY_THRESHOLD = 0.7;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

type Template = (seed: string, name: string, tag: string, tierWord: string) => string;

const TEMPLATES: Template[] = [
  (seed, name, tag, tierWord) =>
    `Fans of ${seed} also gravitate to '${name}' — it carries a strong ${tag} thread, making it a ${tierWord}.`,
  (seed, name, tag, tierWord) =>
    `If ${seed} clicks for them, '${name}' is worth a look: both sit in the ${tag} space, ranked a ${tierWord}.`,
  (seed, name, tag, tierWord) =>
    `'${name}' surfaced from your ${seed} signal through its ${tag} side — a ${tierWord} in this category.`,
];

/**
 * Pick the most topical anchor tag from Qloo's tag list (still real data —
 * just choosing which real tag reads best as the anchor).
 * Raw plot keywords (urn:tag:keyword:media, e.g. "Siamese fighting fish") are
 * deprioritized because they read poorly as a taste anchor; subgenre / style /
 * genre tags ("Character study", "Science") come first. Stable sort keeps the
 * original Qloo order within each preference band, so this is deterministic.
 */
export function pickAnchorTag(
  tags: Array<{ name?: string; type?: string }>,
): string | undefined {
  const usable = tags.filter(
    (t): t is { name: string; type?: string } =>
      typeof t?.name === "string" && t.name.length > 0,
  );
  if (usable.length === 0) return undefined;
  const score = (t: { name: string; type?: string }): number => {
    const ty = (t.type ?? "").toLowerCase();
    if (ty.includes("subgenre")) return 0;
    if (ty.includes("style")) return 1;
    if (ty.includes("genre")) return 2;
    if (ty.includes("audience") || ty.includes("theme") || ty.includes("mood")) return 3;
    if (ty.includes("keyword")) return 5; // last resort: raw plot keywords
    return 4;
  };
  return [...usable].sort((a, b) => score(a) - score(b))[0].name;
}

export function buildReason(args: {
  entityId: string;
  entityName: string;
  anchorTag?: string;
  affinity?: number;
  tier: Tier;
  seedNames: string[];
  seedIds: string[];
}): Reason {
  const { entityId, entityName, anchorTag, affinity, tier, seedNames, seedIds } = args;
  const tierWord = tier.toLowerCase();

  // Honest thin-signal handling: no fabricated connection.
  const thin =
    !anchorTag ||
    (typeof affinity === "number" && affinity < THIN_AFFINITY_THRESHOLD) ||
    seedNames.length === 0;

  if (thin) {
    return {
      text: `No strong signal from your seeds for '${entityName}' — try adding broader tastes.`,
      seedName: seedNames[0],
      seedId: seedIds[0],
      thin: true,
    };
  }

  const seedIdx = hashString(entityId + seedNames[0]) % seedNames.length;
  const seedName = seedNames[seedIdx];
  const template = TEMPLATES[hashString(entityId) % TEMPLATES.length];

  return {
    text: template(seedName, entityName, anchorTag, tierWord),
    seedName,
    seedId: seedIds[seedIdx],
    thin: false,
  };
}
