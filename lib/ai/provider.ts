import { z } from "zod";
import { parseMessage } from "@/lib/services/conversation-memory";
import { DESTINATIONS } from "@/lib/services/mock-data";
import type { SearchCriteria } from "@/lib/services/types";
import { ADVISOR_SYSTEM_PROMPT, summarizeCriteria } from "./system-prompt";
import { composeReply } from "./advisor-voice";
import type { ReplyContext } from "./context";

/**
 * AI provider. Uses an LLM through the Vercel AI SDK when an API key is present
 * (better natural-language understanding + genuinely streamed replies), and
 * transparently falls back to the deterministic advisor engine otherwise.
 *
 * Provider-agnostic: set OPENAI_API_KEY to use OpenAI, or ANTHROPIC_API_KEY to
 * use Claude (OpenAI wins if both are set). Override the models with AI_MODEL /
 * AI_FAST_MODEL.
 */

const PROVIDER: "openai" | "anthropic" = process.env.OPENAI_API_KEY
  ? "openai"
  : "anthropic";
export const hasLLM = Boolean(
  process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
);
// Ignore a model override that belongs to the OTHER provider (e.g. a leftover
// AI_MODEL=claude-... when switching to OpenAI) so switching keys "just works".
function pickModel(envVal: string | undefined, fallback: string): string {
  if (!envVal) return fallback;
  const isClaude = envVal.startsWith("claude");
  const isOpenAI = /^(gpt|o[1-9]|chatgpt)/.test(envVal);
  const mismatched =
    (PROVIDER === "openai" && isClaude) || (PROVIDER === "anthropic" && isOpenAI);
  return mismatched ? fallback : envVal;
}
// Main reply model; and a fast, cheap model for structured extraction + routing
// (runs before the reply streams, so its latency is felt directly).
const MODEL = pickModel(
  process.env.AI_MODEL,
  PROVIDER === "openai" ? "gpt-4o" : "claude-sonnet-5",
);
const FAST_MODEL = pickModel(
  process.env.AI_FAST_MODEL,
  PROVIDER === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5-20251001",
);

/** Resolve the configured provider's model handle for the AI SDK. */
async function chatModel(fast = false) {
  const id = fast ? FAST_MODEL : MODEL;
  if (PROVIDER === "openai") {
    const { openai } = await import("@ai-sdk/openai");
    // Disable OpenAI strict structured outputs — it requires EVERY schema field
    // to be `required`, which rejects our optional-field extraction/routing
    // schemas. Tool-mode (this setting) supports optional fields.
    return openai(id, { structuredOutputs: false });
  }
  const { anthropic } = await import("@ai-sdk/anthropic");
  return anthropic(id);
}

const criteriaPatchSchema = z.object({
  destination: z.string().optional().describe("the city the traveller names, e.g. 'paris', 'miami', 'scottsdale', 'rome' — any city, lowercased"),
  checkIn: z.string().optional().describe("check-in date as YYYY-MM-DD, only if the user gives a concrete date"),
  checkOut: z.string().optional().describe("check-out date as YYYY-MM-DD, only if the user gives a concrete date"),
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
  notes: z
    .array(z.string())
    .optional()
    .describe(
      "Any preference, need or constraint the traveller states that isn't a field above — e.g. 'travelling with a dog', 'high floor', 'gluten-free', 'wheelchair access', 'celebrating 10th anniversary', 'quiet room'. Short phrases; only NEW ones from the latest message.",
    ),
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
    const { generateObject } = await import("ai");
    const { object } = await generateObject({
      model: await chatModel(true),
      schema: criteriaPatchSchema,
      system:
        "Extract ONLY the hotel-search details the user newly states or changes in their latest message, plus any new preference/need/constraint as `notes`. Omit anything not mentioned. Return canonical destination keys.",
      prompt: `Known so far: ${summarizeCriteria(current)}\n\nConversation:\n${messages
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}\n\nLatest user message: "${lastUser.content}"`,
    });
    // Deterministic base first, LLM refinements win on conflicts.
    const merged = { ...base, ...pruneUndefined(object) } as Partial<SearchCriteria>;

    // Normalize the LLM's destination. Known cities → canonical key + label.
    // Unknown cities are kept as a label only (no key) so the advisor can search
    // them live via the WhataHotel API instead of giving up.
    if (merged.destination) {
      const key = merged.destination.toLowerCase();
      if (DESTINATIONS[key]) {
        merged.destination = key;
        merged.destinationLabel = DESTINATIONS[key].label;
      } else if (!base.destination) {
        const raw = merged.destination.trim();
        merged.destination = undefined;
        merged.destinationLabel = raw
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
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

/**
 * Stream a grounded assistant reply for a one-off prompt (e.g. the hotel-page
 * advisor). Throws if no LLM is configured so the caller can fall back.
 */
export async function* streamGrounded(
  system: string,
  prompt: string,
): AsyncGenerator<string, void, unknown> {
  if (!hasLLM) throw new Error("no-llm");
  const { streamText } = await import("ai");
  const result = streamText({
    model: await chatModel(false),
    system,
    messages: [{ role: "user", content: prompt }],
  });
  for await (const delta of result.textStream) yield delta;
}

/** What the router decided the traveller wants this turn. */
export interface TurnRoute {
  action: "recommend" | "compare" | "book" | "explain" | "qa" | "local" | "live" | "smalltalk" | "ask";
  /** Names/ordinals of already-shown hotels the message refers to (explain/qa). */
  targetHotels?: string[];
  /** For qa: the exact factual question to answer. */
  question?: string;
}

const routeSchema = z.object({
  action: z.enum(["recommend", "compare", "book", "explain", "qa", "local", "live", "smalltalk", "ask"]),
  targetHotels: z.array(z.string()).optional(),
  question: z.string().optional(),
});

/**
 * Classify what the traveller wants THIS turn with a fast LLM — far broader than
 * the regex fallback. Returns null when no LLM is configured (caller uses regex).
 */
export async function classifyTurn(
  messages: { role: string; content: string }[],
  current: SearchCriteria,
  shownHotels: { name: string }[],
): Promise<TurnRoute | null> {
  if (!hasLLM) return null;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;
  const shown = shownHotels.length
    ? shownHotels.map((h, i) => `${i + 1}. ${h.name}`).join("; ")
    : "none yet";
  try {
    const { generateObject } = await import("ai");
    const { object } = await generateObject({
      model: await chatModel(true),
      schema: routeSchema,
      system: `Classify what the traveller wants in their latest message to a luxury hotel concierge. Actions:
- recommend: wants hotel suggestions or to search a destination
- compare: wants two or more hotels compared side by side
- book: wants to book / reserve
- explain: wants to understand or contrast hotels already shown ("why this one", "which is better", "pros and cons")
- qa: asks a specific factual question about the hotel itself already shown (breakfast, spa, pool, gym, pets, kids, on-site dining, connecting rooms, cancellation, perks, etc.)
- local: asks about the AREA around a hotel/city — nearby tourist spots, attractions, things to do, museums, restaurants/cafés/bars nearby, the nearest airport, or getting around
- live: wants hotels in a specific city/place
- smalltalk: greeting, thanks, or a general question about how the service works
- ask: anything else, or not enough information yet
Set targetHotels to the shown hotels referenced (by name or ordinal like "the first"). For qa, also put the precise question in "question". Only choose qa/explain/compare when hotels are already shown.`,
      prompt: `Hotels currently shown: ${shown}\nKnown trip so far: ${summarizeCriteria(current)}\nRecent conversation:\n${messages
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}\nLatest message: "${lastUser.content}"`,
    });
    return object as TurnRoute;
  } catch {
    return null;
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
  const { streamText } = await import("ai");

  const situation = buildSituation(ctx);
  const u = ctx.user;
  const persona = u
    ? `TRAVELLER: ${u.firstName}${u.membership === "premium" ? " (Premium member)" : ""}${u.travelerType ? `, travelling as a ${u.travelerType}` : ""}.` +
      `${u.upcomingTripCity ? ` Has an upcoming trip to ${u.upcomingTripCity}.` : u.lastTripCity ? ` Last travelled to ${u.lastTripCity}.` : ""}\n\n`
    : "";
  const tod = ctx.timeOfDay;
  const greetLine = ctx.greet
    ? `THIS IS YOUR FIRST REPLY of the conversation${tod ? ` and it is ${tod} where the traveller is` : ""}. Open with a REFINED, ELEGANT welcome in the manner of a five-star concierge receiving a valued guest — gracious, polished and genuinely warm${tod ? `, suited to the ${tod} (e.g. an elevated "Good ${tod}, and welcome" feel — vary the exact wording)` : ""}${u ? `, welcoming ${u.firstName} by name once` : ""}. Sound like a luxury travel house, never casual or breezy (avoid "hey", "lovely", "hope your day's treating you"), yet effortless and sincere — never flowery, gushing or a canned line. One graceful sentence, then get to helping.\n\n`
    : `This is a CONTINUING conversation, not the first message — do NOT greet, say hello, or wish them a good morning/afternoon/evening again. Just continue naturally.\n\n`;
  const result = streamText({
    model: await chatModel(false),
    system: ADVISOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${persona}${greetLine}Known preferences: ${summarizeCriteria(ctx.criteria)}\n\nThe traveller just said: "${ctx.lastUserMessage}"\n\n${situation}\n\nReply now, in your advisor voice.`,
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
      return `SITUATION: You searched the best hotels in this city and RANKED them best-fit first for the traveller's needs. The app is showing ${ctx.recommendations.length} ranked hotel cards (out of ${ctx.totalFound} found). Real facts for each (use ONLY these — never invent ratings or perks, and NEVER state a nightly price: rates are only confirmed live for specific dates, so say "live rates for your dates" instead of any number):\n${ctx.recommendations
        .map(
          (r) =>
            `#${r.rank} ${r.name}${r.brand ? ` (${r.brand})` : ""} — fit ${r.fitScore.toFixed(1)}/10${r.rating > 0 ? `, guest ${r.rating}/10` : ""}${r.perks?.[0] ? ` · perk: ${r.perks[0].label}` : ""}`,
        )
        .join("\n")}\nIn 1–2 sentences, introduce the ranked shortlist and say why #1 leads with one concrete detail (never a price). The cards show the rest — don't list them. Then add one short line telling them they can select up to 3 hotels from the results and compare them side by side to choose. No preamble.`;
    case "explain": {
      const focus = ctx.focus?.length ? ctx.focus : ctx.recommendations.slice(0, 2);
      return `SITUATION: The traveller wants to understand specific hotels already on screen. Speak specifically and honestly about them using ONLY these facts (NEVER state a nightly price — rates are only confirmed live for specific dates, so say "live rates for your dates"): ${focus
        .map(
          (r) =>
            `${r.name}${r.brand ? ` (${r.brand})` : ""}${r.rating > 0 ? ` — guest ${r.rating}/10` : ""}; amenities: ${(r.amenities ?? []).slice(0, 4).join(", ") || "not listed"}; perk: ${r.perks?.[0]?.label ?? "advisor perks"}; why ranked: ${r.reason ?? "strong overall fit"}`,
        )
        .join(" | ")}. In 2–3 tight sentences, give the real trade-off and who each suits. Invent nothing; no preamble.`;
    }
    case "live":
      return `SITUATION: ${ctx.liveCity} is outside your curated set, so you searched WhataHotel's live availability. The app is showing ${ctx.liveHotels?.length ?? 0} real hotels with live rates and advisor perks (each opens the hotel's booking page). Introduce the live results for ${ctx.liveCity} in one or two sentences — note the rates are live for their dates and perks are included. Do NOT list them; the cards do that.`;
    case "qa": {
      const h = ctx.focus?.[0] ?? ctx.recommendations[0];
      if (!h)
        return `SITUATION: The traveller asked a specific question but no hotel is in focus yet. Answer generally if you can, otherwise ask which hotel (or their destination and dates) so you can be precise.`;
      const dist = (h.distances ?? []).map((d) => `${d.label} ${d.value}`).join(", ");
      return `SITUATION: The traveller asked a specific question about ${h.name}: "${ctx.qaQuestion ?? ctx.lastUserMessage}". Answer it directly and honestly using ONLY these facts about ${h.name} — brand: ${h.brand ?? "independent"}; amenities: ${(h.amenities ?? []).join(", ") || "not listed"}; perks: ${(h.perks ?? []).map((p) => p.label).join(", ") || "advisor perks"}${dist ? `; distances: ${dist}` : ""}; highlights: ${(h.highlights ?? []).slice(0, 3).join("; ") || "n/a"}. If the facts don't cover the question, say you'll confirm it directly with the hotel — never invent. Never quote a nightly price (say "live rates for your dates"). Keep it to 1–3 sentences.`;
    }
    case "local": {
      const a = ctx.localArea;
      const q = ctx.qaQuestion ?? ctx.lastUserMessage;
      if (!a || !a.city)
        return `SITUATION: They asked about the local area but no destination is set. Ask which city (or which hotel) so you can be specific.`;
      const p = a.pois;
      const near = a.hotelName ? `${a.hotelName} (in ${a.city})` : a.city;
      const grounded = p
        ? `Recommend from these real spots near there (pick the ones that answer the question):\nAttractions: ${p.attractions.map((x) => x.name).join(", ")}\nDining: ${p.dining.map((x) => x.name).join(", ")}\nCafés: ${p.cafes.map((x) => x.name).join(", ")}\nMuseums: ${p.museums.map((x) => x.name).join(", ")}\nParks: ${p.parks.map((x) => x.name).join(", ")}\nBars: ${p.bars.map((x) => x.name).join(", ")}\nGetting around: ${p.transport}\n`
        : `Use your own knowledge of ${a.city} — name well-known nearby options.\n`;
      return `SITUATION: The traveller asked about the area around ${near}: "${q}".\n${grounded}Answer concisely — 2–4 short sentences or a tight bullet list — naming a few of the best options that fit exactly what they asked (nearby attractions, restaurants, cafés, or the nearest airport / how to get around). These are area recommendations near the hotel, NOT hotel facilities. If they asked about the airport, name the nearest one and rough travel time from general knowledge. Suggest confirming current hours/timings. No preamble.`;
    }
    case "compare": {
      const cmp = ctx.comparison;
      if (!cmp)
        return `SITUATION: You're comparing hotels side by side. Give a short, opinionated summary and a recommendation.`;
      const facts = cmp.rows
        .map((r) => `${r.label} — ${cmp.hotels.map((h, i) => `${h.name}: ${r.values[i]}`).join(" | ")}`)
        .join("\n");
      const pri = ctx.comparePriority;
      return `SITUATION: You compared these hotels using LIVE data from the WhataHotel API (dated rates, room categories, advisor-exclusive perks, amenities, dining). The table is on screen. Real facts:\n${facts}\n${pri ? `The traveller cares most about ${pri} — weight your pick toward that.\n` : ""}\nReply in AT MOST 3 tight sentences: name the best pick FIRST and why (rate + perks${pri ? ` for ${pri}` : ""}), then the single key trade-off. Use ONLY these facts; never invent a price; if a rate says "Add dates", ask for their dates. No preamble, no restating the question.`;
    }
    case "book": {
      const name = ctx.booking?.hotelName ?? ctx.focus?.[0]?.name ?? "that hotel";
      return `SITUATION: The traveller wants to book ${name}. Booking happens on the hotel's own page — do NOT ask for their name, email, phone or any personal details. In ONE warm sentence, tell them to open ${name} (its "Book now" / "View details" button on the card, or ask you to open it), choose their room in the Rooms section, and hit Reserve — that opens the secure WhataHotel booking form with their dates and advisor perks already filled in.`;
    }
    case "ask":
      return ctx.missing.includes("destination") && ctx.destinationSuggestions?.length
        ? `SITUATION: They're undecided on a destination but you know the vibe. Suggest these and ask which appeals: ${ctx.destinationSuggestions
            .map((d) => d.label)
            .join(", ")}.`
        : `SITUATION: Ask only for these missing details, grouped naturally: ${ctx.missing.join(", ") || "none"}.`;
    case "chat":
      return `SITUATION: Respond warmly and helpfully to the traveller's message: "${ctx.lastUserMessage}". If it's a general question about how WhataHotel works (advisor rates, complimentary perks, in-app booking, comparing hotels), answer it briefly and accurately. Then, in one line, invite them to share their destination, dates and the vibe they're after so you can find the perfect stay.`;
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
