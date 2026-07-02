import { z } from "zod";
import { parseMessage } from "@/lib/services/conversation-memory";
import { DESTINATIONS } from "@/lib/services/mock-data";
import type { SearchCriteria } from "@/lib/services/types";
import { ADVISOR_SYSTEM_PROMPT, summarizeCriteria } from "./system-prompt";
import { composeReply } from "./advisor-voice";
import type { ReplyContext } from "./context";

/**
 * AI provider. Uses Claude through the Vercel AI SDK when ANTHROPIC_API_KEY is
 * present (better natural-language understanding + genuinely streamed replies),
 * and transparently falls back to the deterministic advisor engine otherwise.
 * Provider-agnostic by design — swap @ai-sdk/anthropic for OpenAI/Gemini.
 */

export const hasLLM = Boolean(process.env.ANTHROPIC_API_KEY);
// Current-generation default; override via AI_MODEL. Sonnet 5 balances quality,
// speed and cost for a streaming chat advisor (use claude-opus-4-8 for max quality).
const MODEL = process.env.AI_MODEL || "claude-sonnet-5";

const criteriaPatchSchema = z.object({
  destination: z.string().optional().describe("canonical lowercase city key, e.g. 'paris', 'tokyo', 'bali', 'maldives', 'newyork', 'london', 'lasvegas', 'dubai', 'alps'"),
  travelMonth: z.string().optional(),
  nights: z.number().optional(),
  adults: z.number().optional(),
  children: z.number().optional(),
  budgetMax: z.number().optional().describe("per night, USD"),
  budgetMin: z.number().optional(),
  occasion: z
    .enum([
      "anniversary", "honeymoon", "birthday", "wedding",
      "family", "business", "wellness", "celebration", "leisure",
    ])
    .optional(),
  amenities: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  nearby: z.string().optional(),
});

/**
 * Extract a criteria patch from the latest user message. Deterministic NLU runs
 * first (reliable); when an LLM is configured it refines the result.
 */
export async function extractCriteriaPatch(
  messages: { role: string; content: string }[],
  current: SearchCriteria,
): Promise<Partial<SearchCriteria>> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const base = lastUser ? parseMessage(lastUser.content, current) : {};

  if (!hasLLM || !lastUser) return base;

  try {
    const { anthropic } = await import("@ai-sdk/anthropic");
    const { generateObject } = await import("ai");
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: criteriaPatchSchema,
      system:
        "Extract ONLY the hotel-search details the user newly states or changes in their latest message. Omit anything not mentioned. Return canonical destination keys.",
      prompt: `Known so far: ${summarizeCriteria(current)}\n\nConversation:\n${messages
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}\n\nLatest user message: "${lastUser.content}"`,
    });
    // Deterministic base first, LLM refinements win on conflicts.
    const merged = { ...base, ...pruneUndefined(object) } as Partial<SearchCriteria>;

    // Normalize the LLM's destination to a known key + canonical label.
    if (merged.destination) {
      const key = merged.destination.toLowerCase();
      if (DESTINATIONS[key]) {
        merged.destination = key;
        merged.destinationLabel = DESTINATIONS[key].label;
      } else if (!base.destination) {
        delete merged.destination; // unknown place -> let the advisor ask
      }
    }
    // Trust the deterministic parser for canonical amenity/brand keys.
    if (base.amenities) merged.amenities = base.amenities;
    if (base.brands) merged.brands = base.brands;
    return merged;
  } catch {
    return base; // any failure -> deterministic result
  }
}

function pruneUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/** Stream the advisor's spoken reply for this turn. */
export async function* streamReply(
  ctx: ReplyContext,
): AsyncGenerator<string, void, unknown> {
  if (hasLLM) {
    try {
      yield* streamFromClaude(ctx);
      return;
    } catch {
      // fall through to deterministic
    }
  }
  yield* streamDeterministic(composeReply(ctx));
}

async function* streamFromClaude(
  ctx: ReplyContext,
): AsyncGenerator<string, void, unknown> {
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { streamText } = await import("ai");

  const situation = buildSituation(ctx);
  const u = ctx.user;
  const persona = u
    ? `TRAVELLER: ${u.firstName}${u.membership === "premium" ? " (Premium member)" : ""}${u.travelerType ? `, travelling as a ${u.travelerType}` : ""}.` +
      `${u.upcomingTripCity ? ` Has an upcoming trip to ${u.upcomingTripCity}.` : u.lastTripCity ? ` Last travelled to ${u.lastTripCity}.` : ""}` +
      `${u.greet ? " This is the first message this session — greet them warmly by first name once." : ""}\n\n`
    : "";
  const result = streamText({
    model: anthropic(MODEL),
    system: ADVISOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${persona}Known preferences: ${summarizeCriteria(ctx.criteria)}\n\nThe traveller just said: "${ctx.lastUserMessage}"\n\n${situation}\n\nReply now, in your advisor voice.`,
      },
    ],
  });
  for await (const delta of result.textStream) {
    yield delta;
  }
}

function buildSituation(ctx: ReplyContext): string {
  switch (ctx.action) {
    case "recommend":
      return `SITUATION: You searched the best hotels in this city and RANKED them best-fit first for the traveller's needs. The app is showing ${ctx.recommendations.length} ranked hotel cards (out of ${ctx.totalFound} found). Real facts for each (use ONLY these — never invent prices, ratings, or perks):\n${ctx.recommendations
        .map(
          (r) =>
            `#${r.rank} ${r.name}${r.brand ? ` (${r.brand})` : ""} — fit ${r.fitScore.toFixed(1)}/10, from $${Math.round(r.startingRate).toLocaleString()}/night${r.rating > 0 ? `, guest ${r.rating}/10` : ""}${r.perks?.[0] ? ` · perk: ${r.perks[0].label}` : ""}`,
        )
        .join("\n")}\nBriefly introduce the ranked shortlist and name why #1 leads, citing one concrete detail. Do NOT list full details for all — the cards do that.`;
    case "explain": {
      const focus = ctx.focus?.length ? ctx.focus : ctx.recommendations.slice(0, 2);
      return `SITUATION: The traveller wants to understand specific hotels already on screen. Speak specifically and honestly about them using ONLY these facts: ${focus
        .map(
          (r) =>
            `${r.name}${r.brand ? ` (${r.brand})` : ""} — from $${Math.round(r.startingRate).toLocaleString()}/night${r.rating > 0 ? `, guest ${r.rating}/10` : ""}; amenities: ${(r.amenities ?? []).slice(0, 4).join(", ") || "not listed"}; perk: ${r.perks?.[0]?.label ?? "advisor perks"}; why ranked: ${r.reason ?? "strong overall fit"}`,
        )
        .join(" | ")}. Give the real trade-offs and who each suits. Invent nothing.`;
    }
    case "compare":
      return `SITUATION: The app is rendering a comparison table for: ${ctx.comparison?.hotels
        .map((h) => h.name)
        .join(" vs ")}. Give a short, opinionated summary and a recommendation.`;
    case "book":
      return ctx.booking?.complete
        ? `SITUATION: All booking details are collected for ${ctx.booking.hotelName}. Confirm warmly and say you'll secure the advisor rate + perks.`
        : `SITUATION: You're collecting booking details for ${ctx.booking?.hotelName}. Ask ONLY for: ${ctx.booking?.nextField}. One friendly sentence.`;
    case "ask":
      return ctx.missing.includes("destination") && ctx.destinationSuggestions?.length
        ? `SITUATION: They're undecided on a destination but you know the vibe. Suggest these and ask which appeals: ${ctx.destinationSuggestions
            .map((d) => d.label)
            .join(", ")}.`
        : `SITUATION: Ask only for these missing details, grouped naturally: ${ctx.missing.join(", ") || "none"}.`;
    default:
      return `SITUATION: Open the conversation and invite them to describe the trip.`;
  }
}

async function* streamDeterministic(
  text: string,
): AsyncGenerator<string, void, unknown> {
  // Emit in small chunks to produce a natural "typing" cadence on the client.
  const tokens = text.match(/\S+\s*/g) ?? [text];
  for (const token of tokens) {
    yield token;
    await new Promise((r) => setTimeout(r, 18));
  }
}
