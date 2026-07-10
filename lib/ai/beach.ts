import type { ReplyContext } from "./context";
import {
  beachRelevant,
  formatBeachFacts,
  getBeachCondition,
  type BeachCondition,
} from "@/lib/services/beach-intelligence";

/**
 * Attach current sargassum/beach conditions to the reply context when they're
 * relevant to this turn — a coastal destination, or the traveller explicitly
 * asking about seaweed/beach quality. The advisor then grounds its reply on
 * these facts (see buildSituation / the system prompt).
 *
 * Safe and cheap: no-op when Beach Intelligence isn't configured, when there's
 * no destination, or for inland cities the traveller hasn't asked about.
 */
export async function attachBeachIntelligence(ctx: ReplyContext): Promise<void> {
  const destination =
    ctx.liveCity ||
    ctx.criteria.destinationLabel ||
    ctx.localArea?.city ||
    undefined;

  if (!beachRelevant(destination, ctx.lastUserMessage)) return;
  if (!destination) return;

  const beach = await getBeachCondition(destination);
  if (beach) ctx.beach = beach;
}

/**
 * Build a Beach Intelligence block for the single-shot grounded advisors
 * (hotel page + comparison), which assemble their whole prompt as a system
 * string. Returns "" when nothing relevant — safe to append unconditionally.
 *
 * Gates each destination on relevance (coastal, or the traveller asked),
 * dedupes cities, and formats one line per monitored zone.
 */
export async function beachBriefFor(
  destinations: (string | undefined)[],
  message: string,
): Promise<string> {
  const seen = new Set<string>();
  const wanted: string[] = [];
  for (const d of destinations) {
    const key = d?.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (beachRelevant(d, message)) wanted.push(d as string);
  }
  if (wanted.length === 0) return "";

  const conditions = (
    await Promise.all(wanted.map((d) => getBeachCondition(d)))
  ).filter((c): c is BeachCondition => c !== null);
  if (conditions.length === 0) return "";

  const facts = conditions.map((c) => `- ${formatBeachFacts(c)}`).join("\n");
  return `\n\n==== BEACH INTELLIGENCE (current sargassum conditions — USF/NOAA satellite) ====
These ARE verified facts you may state (risk level, 0-100 beach score; higher = clearer water). Raise them only when the traveller asks about beach/seaweed/water, or a good beach is part of why they're here. If risk is moderate or high and swimming matters, mention the clearer nearby zones. Frame as current conditions that shift week to week — never a guarantee. When no reading is shown for a place, don't guess.
${facts}
==== END BEACH INTELLIGENCE ====`;
}
