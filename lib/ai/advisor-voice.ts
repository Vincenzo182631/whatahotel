import type { CriteriaField } from "@/lib/services/conversation-memory";
import type { SearchCriteria } from "@/lib/services/types";
import type { ReplyContext } from "./context";

/**
 * The deterministic advisor "voice" — composes a warm, human reply for any turn
 * with no LLM required. When ANTHROPIC_API_KEY is set, the provider streams a
 * Claude reply instead; this guarantees the experience never feels broken.
 */

const QUESTION: Record<CriteriaField, string> = {
  destination: "Where in the world are you dreaming of?",
  dates: "When are you travelling, and for how many nights?",
  budget: "What's your ideal nightly budget?",
  occasion: "Is this trip for a special occasion?",
  guests: "How many guests will I be planning for — and any children?",
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function acknowledge(ctx: ReplyContext): string {
  const c = ctx.criteria;
  const seed = ctx.lastUserMessage.length;

  if (ctx.learned.includes("destination") && c.destinationLabel) {
    return pick(
      [
        `${c.destinationLabel.split(",")[0]} — a wonderful choice.`,
        `${c.destinationLabel.split(",")[0]}, beautiful.`,
        `Ah, ${c.destinationLabel.split(",")[0]} — exquisite.`,
      ],
      seed,
    );
  }
  if (ctx.learned.includes("budget") && c.budgetMax) {
    return `Noted — I'll keep us around $${c.budgetMax.toLocaleString()} a night.`;
  }
  if (ctx.learned.includes("occasion") && c.occasion) {
    return `How lovely — a trip to mark ${c.occasion === "anniversary" ? "your anniversary" : `a ${c.occasion}`}.`;
  }
  if (ctx.learned.includes("amenities")) {
    return `Noted — I've added that to your preferences.`;
  }
  return pick(["Wonderful.", "Of course.", "Happy to help."], seed);
}

function summaryClause(c: SearchCriteria): string {
  const bits: string[] = [];
  if (c.occasion) bits.push(`your ${c.occasion}`);
  if (c.budgetMax) bits.push(`a budget around $${c.budgetMax.toLocaleString()}/night`);
  if (c.amenities?.length) {
    const labels: Record<string, string> = {
      spa: "a spa",
      pool: "a pool",
      beachfront: "the beach",
      breakfast: "breakfast included",
      michelin: "great dining",
      oceanview: "ocean views",
      ski: "ski access",
    };
    const a = c.amenities.map((x) => labels[x] ?? x).slice(0, 2);
    bits.push(a.join(" and "));
  }
  if (c.nearby) bits.push(`proximity to ${c.nearby}`);
  if (!bits.length) return "what you've told me";
  if (bits.length === 1) return bits[0];
  return `${bits.slice(0, -1).join(", ")} and ${bits.slice(-1)}`;
}

function composeAsk(ctx: ReplyContext): string {
  const ack = acknowledge(ctx);

  // Undecided on destination but we know the mood — suggest places.
  if (
    ctx.missing.includes("destination") &&
    ctx.destinationSuggestions &&
    ctx.destinationSuggestions.length
  ) {
    const names = ctx.destinationSuggestions.slice(0, 3).map((d) => d.label.split(",")[0]);
    const list =
      names.length > 1
        ? `${names.slice(0, -1).join(", ")} or ${names.slice(-1)}`
        : names[0];
    return `${ack} For that, I'd point you toward ${list}. Which calls to you — or shall I tell you more about each?`;
  }

  const toAsk = ctx.missing.slice(0, 3);
  if (toAsk.length === 0) {
    return `${ack} I think I have everything I need — shall I pull together some options?`;
  }
  if (toAsk.length === 1) {
    return `${ack} ${QUESTION[toAsk[0]]}`;
  }
  const bullets = toAsk.map((f) => `• ${QUESTION[f]}`).join("\n");
  return `${ack} May I ask a couple of quick things?\n\n${bullets}`;
}

function composeRecommend(ctx: ReplyContext): string {
  const c = ctx.criteria;
  const dest = c.destinationLabel?.split(",")[0] ?? "your destination";
  const n = ctx.recommendations.length;
  if (n === 0) {
    return `I looked across ${dest}, but nothing quite fits those exact details. If we nudge the budget or relax one preference, I can show you some exceptional options — what would you like to adjust?`;
  }
  const intro = `I found ${ctx.totalFound} hotel${ctx.totalFound === 1 ? "" : "s"} in ${dest}. Based on ${summaryClause(c)}, here ${n === 1 ? "is my top pick" : `are my top ${n}`}.`;
  const outro =
    n > 1
      ? ` Tell me to compare any two, ask why I chose one, or say "book" when you're ready.`
      : ` Ask me anything about it, or say "book" when you're ready.`;
  return intro + outro;
}

function composeCompare(ctx: ReplyContext): string {
  if (!ctx.comparison) return "Tell me which two hotels you'd like me to compare.";
  return `Here's how ${ctx.comparison.hotels.map((h) => h.name).join(" and ")} compare, side by side. ${ctx.comparison.recommendation}`;
}

const BOOKING_PROMPTS: Record<string, string> = {
  guestName: "Whose name should the reservation be under?",
  email: "What's the best email for your confirmation?",
  phone: "And a phone number, in case the hotel needs to reach you?",
  bedPreference: "Any bed preference — one king, or two beds?",
  specialRequests: "Any special requests? (early check-in, a celebration touch, dietary needs…)",
  arrivalTime: "Roughly what time will you be arriving?",
};

function composeBook(ctx: ReplyContext): string {
  const b = ctx.booking;
  if (!b) return "Wonderful — which hotel would you like to book?";
  if (b.complete) {
    return `That's everything I need, thank you. Here's your booking summary for ${b.hotelName} — review it and I'll secure the reservation with our advisor rate and perks.`;
  }
  const justStarted = b.collected.length === 0;
  const lead = justStarted
    ? `Wonderful choice — ${b.hotelName}. I'll take care of this for you. `
    : `Got it. `;
  const next = b.nextField ? BOOKING_PROMPTS[b.nextField] : "";
  return `${lead}${next}`;
}

function composeChat(ctx: ReplyContext): string {
  return `${acknowledge(ctx)} Tell me a little about the trip you have in mind — a destination, the occasion, or just the feeling you're after — and I'll take it from there.`;
}

export function composeReply(ctx: ReplyContext): string {
  switch (ctx.action) {
    case "recommend":
      return composeRecommend(ctx);
    case "compare":
      return composeCompare(ctx);
    case "book":
      return composeBook(ctx);
    case "chat":
      return composeChat(ctx);
    case "ask":
    default:
      return composeAsk(ctx);
  }
}
