import type { CriteriaField } from "@/lib/services/conversation-memory";
import type { Recommendation, SearchCriteria } from "@/lib/services/types";
import { answerHotelQuestion } from "@/lib/chat/hotel-qa";
import type { AdvisorUser, ReplyContext } from "./context";

/** A warm, personalised opener for a signed-in traveller's first turn. */
function greeting(user?: AdvisorUser): string {
  if (!user?.greet) return "";
  if (user.upcomingTripCity) {
    return `Welcome back, ${user.firstName} — looking forward to your ${user.upcomingTripCity} trip. `;
  }
  if (user.lastTripCity) {
    return `Welcome back, ${user.firstName} — lovely to see you again after ${user.lastTripCity}. `;
  }
  return `Welcome back, ${user.firstName}. `;
}

/** One grounded clause about a specific hotel, from real data only. */
function hotelClause(r: Recommendation): string {
  const perk = r.perks?.[0]?.label;
  const rating = r.rating > 0 ? `guest-rated ${r.rating}/10` : "";
  const meta = [r.brand, rating].filter(Boolean).join(", ");
  const tail = perk ? `, with ${perk.replace(/\.$/, "").toLowerCase()}` : "";
  return `${r.name}${meta ? ` (${meta})` : ""}${tail}`;
}

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

function composeLive(ctx: ReplyContext): string {
  const city = ctx.liveCity ?? "there";
  const hotels = ctx.liveHotels ?? [];
  const n = hotels.length;
  if (n === 0) {
    return `I'm sorry — I couldn't find any WhataHotel properties in ${city} at the moment; that destination isn't in our collection right now. If there's a nearby city you'd consider I'm happy to look, or email info@lorrainetravel.com and the team will help arrange ${city} directly.`;
  }
  const intent = ctx.liveIntent && ctx.liveIntent !== "general stay" ? ctx.liveIntent : null;
  const top = hotels[0];
  const topNote = [top?.distanceLabel, top?.matchReason].filter(Boolean).join(" · ");
  if (intent) {
    return `${greeting(ctx.user)}For ${city} (${intent}), I ranked WhataHotel's live availability by what actually fits — ${n} ${n === 1 ? "hotel" : "hotels"} with live rates and advisor perks.${
      top && topNote ? ` ${top.name} leads: ${topNote}.` : ""
    } Tap any to view rates and book.`;
  }
  return `${greeting(ctx.user)}${city} isn't in my curated list, so I checked WhataHotel's live availability — here ${n === 1 ? "is a match" : `are ${n} matches`} with live rates and advisor perks for your dates. Tap any to view rates and book.`;
}

function composeAsk(ctx: ReplyContext): string {
  // Live search for a city outside the local set needs concrete dates.
  if (ctx.liveCity && (!ctx.criteria.checkIn || !ctx.criteria.checkOut)) {
    return `${greeting(ctx.user)}I can search ${ctx.liveCity} live across WhataHotel — just tell me your check-in and check-out dates and I'll pull real rates and perks.`;
  }
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
  const intro = `${greeting(ctx.user)}I searched the best hotels in ${dest} and ranked them for ${summaryClause(c)}. Here ${n === 1 ? "is your top match" : `are your top ${n}, scored out of 10`}.`;
  const top = ctx.recommendations[0];
  const lead = top ? ` Leading is ${hotelClause(top)}.` : "";
  const outro =
    n > 1
      ? ` They're ranked best-fit first. Tip: select up to 3 hotels from the results to compare them side by side — or say "book" when you're ready.`
      : ` Ask me anything about it, or say "book" when you're ready.`;
  return intro + lead + outro;
}

function composeExplain(ctx: ReplyContext): string {
  const picks = ctx.focus?.length ? ctx.focus : ctx.recommendations.slice(0, 1);
  if (!picks.length) {
    return "Tell me which of the hotels you'd like me to say more about.";
  }
  if (picks.length === 1) {
    const r = picks[0];
    const amen = r.amenities?.slice(0, 3).join(", ");
    const why = r.reason ? ` ${r.reason}` : "";
    const amenLine = amen ? ` Highlights include ${amen}.` : "";
    return `${hotelClause(r)}.${why}${amenLine} Say "book" and I'll secure it with our advisor rate and perks.`;
  }
  const lines = picks
    .slice(0, 3)
    .map((r) => `• ${hotelClause(r)}${r.reason ? ` — ${r.reason}` : ""}`)
    .join("\n");
  return `Here's the honest read on each:\n\n${lines}\n\nWant me to compare any two side by side, or shall I book one?`;
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
  const hi = greeting(ctx.user) || `${acknowledge(ctx)} `;
  return `${hi}Tell me a little about the trip you have in mind — a destination, the occasion, or just the feeling you're after — and I'll take it from there.`;
}

function composeQa(ctx: ReplyContext): string {
  const h = ctx.focus?.[0] ?? ctx.recommendations[0];
  if (!h)
    return "Happy to help — which hotel are you asking about? Or tell me your destination and dates and I'll be precise.";
  return answerHotelQuestion(h, ctx.qaQuestion ?? ctx.lastUserMessage);
}

function composeLocal(ctx: ReplyContext): string {
  const a = ctx.localArea;
  if (!a?.city) return "Which city (or which hotel) shall I suggest nearby spots for?";
  const p = a.pois;
  const where = a.hotelName ?? a.city;
  if (!p)
    return `Around ${where} there's plenty to explore. Tell me whether you'd like attractions, dining, cafés or transport, and I'll be specific.`;
  const q = (ctx.qaQuestion ?? ctx.lastUserMessage).toLowerCase();
  const list = (arr: { name: string }[], n = 3) => arr.slice(0, n).map((x) => x.name).join(", ");
  if (/airport|getting around|transport|metro|how (do|to) (i|you) get/.test(q))
    return `Getting around ${a.city}: ${p.transport}`;
  if (/restaurant|where to eat|dining|food|dinner|lunch/.test(q))
    return `Excellent tables near ${where}: ${list(p.dining)}. Want me to book one?`;
  if (/caf[eé]|coffee/.test(q)) return `For coffee near ${where}: ${list(p.cafes)}.`;
  if (/bar|nightlife|drink/.test(q)) return `For an evening drink nearby: ${list(p.bars)}.`;
  if (/museum/.test(q)) return `Museums close by: ${list(p.museums)}.`;
  if (/park|garden|green/.test(q)) return `Green spaces nearby: ${list(p.parks)}.`;
  if (/shop|boutique|mall/.test(q)) return `For shopping: ${list(p.shopping)}.`;
  return `Near ${where}: ${list(p.attractions, 4)}. ${p.transport}`;
}

export function composeReply(ctx: ReplyContext): string {
  switch (ctx.action) {
    case "recommend":
      return composeRecommend(ctx);
    case "compare":
      return composeCompare(ctx);
    case "explain":
      return composeExplain(ctx);
    case "qa":
      return composeQa(ctx);
    case "local":
      return composeLocal(ctx);
    case "live":
      return composeLive(ctx);
    case "book":
      return composeBook(ctx);
    case "chat":
      return composeChat(ctx);
    case "ask":
    default:
      return composeAsk(ctx);
  }
}
