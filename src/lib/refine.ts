/**
 * Deterministic free-text instruction parser for the refine loop — NO LLM, deliberate.
 *
 * Pure regex mapping from natural-language refinement instructions to
 * recommendation parameters. Every rule below is explicit, testable and
 * echoed back to the caller as { parsed intent } so the UI can show
 * exactly what was understood.
 *
 * Supported instructions:
 *   "under $30" / "under 30 dollars" / "$40 max"   → budget = N
 *   "nothing edible" / "no food"                   → drop the place category
 *                                                  (experiences/dining)
 *   "nothing to wear" / "no clothes"              → drop the brand category
 *                                                  (fashion/wearables)
 *   "she already has too many books" / "no books"  → drop the book category
 *   "more practical"                               → soft-priority:
 *                                                  book, podcast, movie first
 *
 * Unknown text → honest "no actionable instruction detected", results unchanged.
 */

import type { Category } from "./recommend";

export interface ParsedIntent {
  budget?: number;
  excludedCategories: Category[];
  priorityCategories?: Category[];
  /** human-readable echo of what was understood */
  message: string;
}

const RULES: Array<{
  pattern: RegExp;
  apply: (intent: ParsedIntent, match: RegExpMatchArray) => string;
}> = [
  {
    // "under $30", "under 30 dollars", "$40 max", "budget 50"
    pattern: /(?:under|below|max|budget)\s*\$?\s*(\d+(?:\.\d+)?)|(?:\$)\s*(\d+(?:\.\d+)?)\s*(?:max|or\s+less|budget)/,
    apply: (intent, m) => {
      const n = Number(m[1] ?? m[2]);
      if (!Number.isFinite(n) || n <= 0) return "";
      intent.budget = n;
      return `budget set to $${n}`;
    },
  },
  {
    pattern: /\bnothing edible\b|\bno food\b|\bnot edible\b|\bnothing to eat\b/,
    apply: (intent) => {
      intent.excludedCategories.push("place");
      return "dropping experiences & dining (place picks)";
    },
  },
  {
    pattern: /\bnothing to wear\b|\bno clothes\b|\bno clothing\b|\bnothing wearable\b|\bdon'?t want clothes\b/,
    apply: (intent) => {
      intent.excludedCategories.push("brand");
      return "dropping fashion & wearables (brand picks)";
    },
  },
  {
    pattern: /\btoo many books?\b|\bno books?\b|\benough books?\b|\bshe already has\b/,
    apply: (intent) => {
      intent.excludedCategories.push("book");
      return "dropping book picks";
    },
  },
  {
    pattern: /\bmore practical\b|\bpractical\b|\buseful\b/,
    apply: (intent) => {
      intent.priorityCategories = ["book", "podcast", "movie"];
      return "prioritizing practical picks: books, podcasts, movies";
    },
  },
];

export function parseInstruction(text: string): ParsedIntent {
  const intent: ParsedIntent = { excludedCategories: [], message: "" };
  const notes: string[] = [];

  for (const rule of RULES) {
    const m = text.match(rule.pattern);
    if (!m) continue;
    const note = rule.apply(intent, m);
    if (note) notes.push(note);
  }

  intent.excludedCategories = [...new Set(intent.excludedCategories)];
  intent.message =
    notes.length > 0
      ? `Got it — ${notes.join("; ")}.`
      : "No actionable instruction detected; results unchanged.";
  return intent;
}
