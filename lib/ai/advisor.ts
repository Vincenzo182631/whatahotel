import {
  buildComparison,
  destinationKnowledgeService,
  mergeCriteria,
  missingFields,
  readyToRecommend,
  recommendationService,
  sessionStorageService,
} from "@/lib/services";
import type { Hotel, Recommendation } from "@/lib/services/types";
import type {
  AdvisorPayload,
  BookingDraft,
  ChatRequestBody,
} from "@/lib/chat/types";
import type { AdvisorUser, ReplyContext } from "./context";
import { extractCriteriaPatch } from "./provider";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";

const ORDINALS: Record<string, number> = {
  first: 0, "1st": 0, one: 0,
  second: 1, "2nd": 1, two: 1,
  third: 2, "3rd": 2, three: 2,
  fourth: 3, "4th": 3, four: 3,
};

const BOOKING_FIELDS = [
  "guestName",
  "email",
  "phone",
  "bedPreference",
  "specialRequests",
  "arrivalTime",
] as const;
type BookingField = (typeof BOOKING_FIELDS)[number];

const PATCH_TO_FIELD: Record<string, string> = {
  destination: "destination",
  destinationLabel: "destination",
  budgetMax: "budget",
  budgetMin: "budget",
  occasion: "occasion",
  amenities: "amenities",
  vibes: "vibes",
  brands: "brands",
  nearby: "nearby",
  nights: "dates",
  travelMonth: "dates",
  adults: "guests",
  children: "guests",
};

function nextBookingField(collected: string[]): BookingField | null {
  return BOOKING_FIELDS.find((f) => !collected.includes(f)) ?? null;
}

/** Resolve which previously-shown hotels the user means for compare/book. */
function resolveHotels(
  text: string,
  last: Recommendation[],
  explicitIds?: string[],
): Hotel[] {
  if (explicitIds?.length) {
    return explicitIds
      .map((id) => last.find((h) => h.id === id))
      .filter(Boolean) as Hotel[];
  }
  const t = text.toLowerCase();
  const picked: Hotel[] = [];

  // by name
  for (const h of last) {
    const key = h.name.toLowerCase().split(" ")[1] ?? h.name.toLowerCase();
    if (t.includes(h.name.toLowerCase()) || t.includes(key)) picked.push(h);
  }
  // by ordinal / number
  for (const [word, idx] of Object.entries(ORDINALS)) {
    if (new RegExp(`\\b${word}\\b`).test(t) && last[idx] && !picked.includes(last[idx])) {
      picked.push(last[idx]);
    }
  }
  return picked;
}

function detectIntent(
  text: string,
): "compare" | "book" | "explain" | "recommend" | null {
  const t = text.toLowerCase();
  if (/\bcompare\b|side by side|versus|\bvs\b|difference between/.test(t)) return "compare";
  if (/\bbook\b|reserve|booking|i'?ll take|let'?s book/.test(t)) return "book";
  // "why did you pick", "tell me more about the first", "which is better" — talk
  // about the hotels already shown. Checked before recommend so "why…rank" wins.
  if (
    /\bwhy\b|tell me (more|about)|more about|what about the|\bexplain\b|which (one|is|hotel)|worth it|pros and cons/.test(
      t,
    )
  )
    return "explain";
  if (
    /recommend|show me|find me|options|suggestions?|what do you|go ahead|best hotel|top hotel|best place|rank|search/.test(
      t,
    )
  )
    return "recommend";
  return null;
}

/** Build the personalisation context for a signed-in traveller (if any). */
async function buildAdvisorUser(isFirstTurn: boolean): Promise<AdvisorUser | undefined> {
  const account = await getCurrentUser();
  if (!account) return undefined;
  const trips = await store.listTrips(account.id);
  const now = Date.now();
  const past = trips
    .filter((t) => new Date(t.checkOut).getTime() < now)
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const upcoming = trips
    .filter((t) => new Date(t.checkOut).getTime() >= now)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  return {
    firstName: account.name.split(" ")[0] || account.name,
    travelerType: account.profile.travelerType,
    membership: account.membership,
    lastTripCity: past[0]?.city,
    upcomingTripCity: upcoming[0]?.city,
    greet: isFirstTurn,
  };
}

function valueForBookingField(field: BookingField, text: string): string {
  const trimmed = text.trim();
  if (field === "email") {
    const m = trimmed.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    return m ? m[0] : trimmed;
  }
  if (field === "phone") {
    const m = trimmed.match(/[\d][\d\s().+-]{6,}\d/);
    return m ? m[0].trim() : trimmed;
  }
  if ((field === "specialRequests") && /^(no|none|nothing|nope|n\/a)\.?$/i.test(trimmed)) {
    return "None";
  }
  return trimmed;
}

const BOOKING_LABEL: Record<BookingField, string> = {
  guestName: "guestName",
  email: "email",
  phone: "phone",
  bedPreference: "bedPreference",
  specialRequests: "specialRequests",
  arrivalTime: "arrivalTime",
};

/**
 * Run a single advisor turn: update memory, decide the action, gather any
 * recommendations / comparison / booking state, and return the context the
 * reply generator will speak from. Persists everything to the session.
 */
export async function runTurn(
  body: ChatRequestBody,
): Promise<{ ctx: ReplyContext; payload: AdvisorPayload }> {
  const { sessionId, messages, intent } = body;
  const session = sessionStorageService.get(sessionId);
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // ---- 1. Active booking flow takes priority (unless the user pivots) -------
  const pivoting =
    /\b(cancel|stop|never ?mind|actually|change|different hotel|new search)\b/i.test(
      lastUserMessage,
    );
  if (session.booking && !session.booking.complete && !pivoting && intent?.type !== "compare") {
    return continueBooking(sessionId, session.booking, lastUserMessage);
  }

  // ---- 2. Update conversation memory --------------------------------------
  const user = await buildAdvisorUser(!messages.some((m) => m.role === "assistant"));
  const patch = await extractCriteriaPatch(messages, session.criteria);
  const criteria = mergeCriteria(session.criteria, patch);
  const learned = [
    ...new Set(
      Object.keys(patch)
        .map((k) => PATCH_TO_FIELD[k])
        .filter(Boolean),
    ),
  ];
  sessionStorageService.save(sessionId, { criteria });

  const explicitIntent = intent?.type ?? detectIntent(lastUserMessage);

  // ---- 3. Booking start ---------------------------------------------------
  if (explicitIntent === "book") {
    const hotels = resolveHotels(lastUserMessage, session.lastRecommendations, intent?.hotelIds);
    const hotel = hotels[0] ?? session.lastRecommendations[0];
    if (hotel) {
      const booking: BookingDraft = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        collected: [],
        nextField: "guestName",
        complete: false,
      };
      sessionStorageService.save(sessionId, { booking });
      const ctx: ReplyContext = {
        action: "book",
        criteria,
        missing: [],
        recommendations: session.lastRecommendations,
        totalFound: session.lastRecommendations.length,
        booking,
        learned,
        lastUserMessage,
        user,
      };
      return { ctx, payload: { action: "book", criteria, booking } };
    }
  }

  // ---- 4. Comparison ------------------------------------------------------
  if (explicitIntent === "compare") {
    let hotels = resolveHotels(lastUserMessage, session.lastRecommendations, intent?.hotelIds);
    if (hotels.length < 2) hotels = session.lastRecommendations.slice(0, 2);
    if (hotels.length >= 2) {
      const comparison = buildComparison(hotels.slice(0, 3));
      const ctx: ReplyContext = {
        action: "compare",
        criteria,
        missing: [],
        recommendations: session.lastRecommendations,
        totalFound: session.lastRecommendations.length,
        comparison,
        learned,
        lastUserMessage,
        user,
      };
      return { ctx, payload: { action: "compare", criteria, comparison } };
    }
  }

  // ---- 4b. Explain / "why this one" — talk about hotels already shown -----
  if (explicitIntent === "explain" && session.lastRecommendations.length) {
    let focus = resolveHotels(lastUserMessage, session.lastRecommendations) as Recommendation[];
    if (!focus.length) focus = session.lastRecommendations.slice(0, 2);
    const ctx: ReplyContext = {
      action: "explain",
      criteria,
      missing: [],
      recommendations: session.lastRecommendations,
      totalFound: session.lastRecommendations.length,
      focus,
      learned,
      lastUserMessage,
      user,
    };
    // No recommendations in the payload — the cards are already on screen.
    return { ctx, payload: { action: "explain", criteria } };
  }

  // ---- 5. Recommend (explicit ask OR enough signal) -----------------------
  const shouldRecommend =
    criteria.destination &&
    (explicitIntent === "recommend" || readyToRecommend(criteria));

  if (shouldRecommend) {
    const { recommendations, totalFound } = await recommendationService.recommend(
      criteria,
      5,
    );
    sessionStorageService.save(sessionId, { lastRecommendations: recommendations });
    const ctx: ReplyContext = {
      action: "recommend",
      criteria,
      missing: missingFields(criteria),
      recommendations,
      totalFound,
      learned,
      lastUserMessage,
      user,
    };
    return {
      ctx,
      payload: { action: "recommend", criteria, recommendations, totalFound },
    };
  }

  // ---- 6. Ask for what's missing -----------------------------------------
  const missing = missingFields(criteria);
  const destinationSuggestions =
    !criteria.destination && criteria.vibes?.length
      ? destinationKnowledgeService.suggestForVibes(criteria.vibes)
      : undefined;

  const isGreeting =
    learned.length === 0 &&
    !criteria.destination &&
    /^(hi|hey|hello|good (morning|evening|afternoon)|yo|howdy)\b/i.test(
      lastUserMessage.trim(),
    );

  const ctx: ReplyContext = {
    action: isGreeting ? "chat" : "ask",
    criteria,
    missing,
    recommendations: session.lastRecommendations,
    totalFound: session.lastRecommendations.length,
    destinationSuggestions,
    learned,
    lastUserMessage,
    user,
  };
  return {
    ctx,
    payload: { action: ctx.action, criteria, missing, recommendations: undefined },
  };
}

function continueBooking(
  sessionId: string,
  booking: BookingDraft,
  message: string,
): { ctx: ReplyContext; payload: AdvisorPayload } {
  const field = (booking.nextField as BookingField) ?? nextBookingField(booking.collected);
  if (field) {
    const value = valueForBookingField(field, message);
    (booking as unknown as Record<string, unknown>)[BOOKING_LABEL[field]] = value;
    booking.collected = [...booking.collected, field];
  }
  booking.nextField = nextBookingField(booking.collected);
  booking.complete = booking.nextField === null;
  sessionStorageService.save(sessionId, { booking });

  const ctx: ReplyContext = {
    action: "book",
    criteria: sessionStorageService.get(sessionId).criteria,
    missing: [],
    recommendations: sessionStorageService.get(sessionId).lastRecommendations,
    totalFound: 0,
    booking,
    learned: [],
    lastUserMessage: message,
  };
  return { ctx, payload: { action: "book", criteria: ctx.criteria, booking } };
}
