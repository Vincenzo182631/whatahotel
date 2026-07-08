/**
 * Perk vs. condition classification, shared by every surface that shows the
 * "Exclusive Complimentary Perks" section so it renders consistently.
 *
 * The source mixes headline benefits ("Full Breakfast x 2 Daily") with long
 * terms/fine-print ("A 100 Credit will be applicable for booking any Room
 * Category… The Credit is per stay and may be used towards…"). We show the
 * benefits as the perks and demote the fine-print to a smaller "conditions" note.
 */

const CONDITION_SIGNALS =
  /\b(applicable|excluding|per stay|subject to|cannot be|one[-\s]?time|duration of|black[-\s]?out|not combinable|combinable|terms|restrictions|back[-\s]?to[-\s]?back|consecutive)\b/i;

/** True when a perk line reads like terms/fine-print rather than a headline perk. */
export function isPerkCondition(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  // Long lines, or lines that read like conditions, are fine-print.
  return t.length > 90 || CONDITION_SIGNALS.test(t);
}

/** Split raw perk strings into headline perks and fine-print conditions. */
export function splitPerks(raw: (string | { label?: string })[]): {
  perks: string[];
  conditions: string[];
} {
  const clean = raw
    .map((p) => (typeof p === "string" ? p : p?.label || ""))
    .map((s) => s.replace(/\*+$/g, "").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const deduped = clean.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
  return {
    perks: deduped.filter((p) => !isPerkCondition(p)),
    conditions: deduped.filter((p) => isPerkCondition(p)),
  };
}
