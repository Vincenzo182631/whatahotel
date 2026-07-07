import {
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
import { extractCriteriaPatch, classifyTurn } from "./provider";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import {
  getCityHotels,
  buildLiveComparison,
  attachLiveCoordinates,
  attachLiveInfo,
} from "@/lib/services/live-rates";
import { bareCountry } from "./country-links";
import { CITY_POIS } from "./itinerary-data";
import {
  parseTravelIntent,
  rankLiveHotels,
  summarizeIntent,
  getAnchor,
  validateAnchor,
  applyIntentRanking,
  buildLiveMatchReason,
} from "./travel-intent";

/** Pull concrete ISO dates the user typed (checkIn = earliest, checkOut = next). */
function parseIsoDates(text: string): { checkIn?: string; checkOut?: string } {
  const found = [...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]);
  if (found.length >= 2) {
    const [a, b] = found.slice(0, 2).sort();
    return { checkIn: a, checkOut: b };
  }
  return {};
}

const CITY_STOPWORDS = new Set([
  "the", "a", "an", "there", "here", "home", "town", "city",
  "january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
]);

/** Best-effort city name after a preposition, for the no-LLM path. */
function heuristicCity(text: string): string | undefined {
  const m = text.match(/\b(?:in|to|at|near|visiting|visit|around)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (!m) return undefined;
  const candidate = m[1].trim();
  if (CITY_STOPWORDS.has(candidate.toLowerCase())) return undefined;
  return candidate;
}

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

/** What the traveller most wants to weigh the comparison on, if they signalled it. */
function detectPriority(
  text: string,
  criteria: { occasion?: string; amenities?: string[] },
): string | undefined {
  const t = text.toLowerCase();
  if (/\bspa\b|wellness|massage/.test(t)) return "spa & wellness";
  if (/dining|restaurant|food|michelin|eat\b|cuisine/.test(t)) return "dining";
  if (/location|near|close|central|walk|distance|steps from/.test(t)) return "location";
  if (/budget|cheap|value|price|afford|deal|money/.test(t)) return "value";
  if (/\bfamily\b|kids?|child|children/.test(t)) return "families";
  if (/honeymoon|romantic|anniversary|couple/.test(t)) return "romance";
  if (/pool|beach|ocean/.test(t)) return "pool & beach";
  if (/business|work|meeting|gym|wifi/.test(t)) return "business travel";
  if (criteria.occasion) return criteria.occasion;
  if (criteria.amenities?.length) return criteria.amenities[0];
  return undefined;
}

/** Resolve router-provided hotel references (names or ordinals) to shown hotels. */
function resolveByNames(names: string[], last: Recommendation[]): Recommendation[] {
  const out: Recommendation[] = [];
  for (const raw of names) {
    const t = raw.trim().toLowerCase();
    const ord = ORDINALS[t];
    if (ord !== undefined && last[ord] && !out.includes(last[ord])) {
      out.push(last[ord]);
      continue;
    }
    const match = last.find(
      (h) => h.name.toLowerCase().includes(t) || t.includes(h.name.toLowerCase()),
    );
    if (match && !out.includes(match)) out.push(match);
  }
  return out;
}

function detectIntent(
  text: string,
): "compare" | "book" | "explain" | "recommend" | "qa" | "local" | null {
  const t = text.toLowerCase();
  if (/\bcompare\b|side by side|versus|\bvs\b|difference between/.test(t)) return "compare";
  if (/\bbook\b|reserve|booking|i'?ll take|let'?s book/.test(t)) return "book";
  // Local AREA questions — nearby spots, attractions, dining out, transport.
  if (
    /near ?by|near the hotel|around (here|the hotel|it)|close by|walking distance|things to do|what to (see|do)|tourist|sightsee|attractions?|landmarks?|\bmuseums?\b|\bcaf[eé]s?\b|coffee shop|nightlife|where to eat|restaurants? (near|nearby|around|close)|getting around|\bairport\b|day trip|neighbou?rhood|explore/.test(
      t,
    )
  )
    return "local";
  // "why did you pick", "tell me more about the first", "which is better" — talk
  // about the hotels already shown. Checked before recommend so "why…rank" wins.
  if (
    /\bwhy\b|tell me (more|about)|more about|what about the|\bexplain\b|which (one|is|hotel|of)|worth it|pros and cons|better/.test(
      t,
    )
  )
    return "explain";
  // Factual questions about a hotel (breakfast, spa, airport distance, pets…).
  if (
    /how far|distance|near(est)?|airport|breakfast|\bspa\b|\bpool\b|\bgym\b|fitness|\bpets?\b|\bdogs?\b|parking|wi-?fi|cancel|refund|connecting|adjoin|\bview\b|\bkids?\b|children|check.?in|check.?out|\bincluded\b|dining|restaurant|transfer|smoking|accessible/.test(
      t,
    )
  )
    return "qa";
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
  const session = await sessionStorageService.get(sessionId);
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

  // ---- 2. Update conversation memory + classify intent (in parallel) ------
  const user = await buildAdvisorUser(!messages.some((m) => m.role === "assistant"));
  const [patch, route] = await Promise.all([
    extractCriteriaPatch(messages, session.criteria),
    classifyTurn(messages, session.criteria, session.lastRecommendations),
  ]);
  const routed = route?.action;
  const criteria = mergeCriteria(session.criteria, patch);
  // Fold in the cross-chatbot traveller memory so the main chat knows what the
  // guest told the hotel/compare advisors too, and never re-asks it.
  if (Array.isArray(body.memory) && body.memory.length) {
    const notes = [...(criteria.notes ?? [])];
    for (const m of body.memory) {
      const clean = String(m).trim();
      if (clean && !notes.some((n) => n.toLowerCase() === clean.toLowerCase())) notes.push(clean);
    }
    criteria.notes = notes.slice(-16);
  }
  // Fill concrete dates from any ISO date the user typed (LLM covers loose dates).
  if (!criteria.checkIn || !criteria.checkOut) {
    const d = parseIsoDates(lastUserMessage);
    if (d.checkIn && d.checkOut) {
      criteria.checkIn = criteria.checkIn || d.checkIn;
      criteria.checkOut = criteria.checkOut || d.checkOut;
      await sessionStorageService.save(sessionId, { criteria });
    }
  }
  const learned = [
    ...new Set(
      Object.keys(patch)
        .map((k) => PATCH_TO_FIELD[k])
        .filter(Boolean),
    ),
  ];
  await sessionStorageService.save(sessionId, { criteria });

  const regexIntent = detectIntent(lastUserMessage);
  // When the traveller clearly points at hotels already on screen ("the first",
  // "these", "which of them", "it"), trust the deterministic explain/qa/compare
  // read over a re-search — a follow-up should never silently re-run the search.
  const refersToShown =
    session.lastRecommendations.length > 0 &&
    /\b(the (first|second|third|1st|2nd|3rd)|first one|second one|third one|it|its|it's|this one|that one|these|those|them|which (one|of))\b/i.test(
      lastUserMessage,
    );
  const routedIntent =
    routed === "compare" ||
    routed === "book" ||
    routed === "explain" ||
    routed === "recommend" ||
    routed === "qa" ||
    routed === "local"
      ? routed
      : undefined;
  const explicitIntent =
    intent?.type ??
    (refersToShown &&
    (regexIntent === "explain" ||
      regexIntent === "qa" ||
      regexIntent === "compare" ||
      regexIntent === "local")
      ? regexIntent
      : undefined) ??
    routedIntent ??
    regexIntent;

  // ---- 3. Booking — hand off to the real WhataHotel booking form ----------
  // We no longer collect guest details in chat; booking happens on the hotel's
  // page (pick a room → Reserve → the prefilled WhataHotel booking form). So the
  // advisor just points them there. A "complete" booking marker on the context
  // (not persisted, not in the payload) tells the reply which hotel to name.
  if (explicitIntent === "book") {
    const hotels = resolveHotels(lastUserMessage, session.lastRecommendations, intent?.hotelIds);
    const hotel = hotels[0] ?? session.lastRecommendations[0];
    if (hotel) {
      const booking: BookingDraft = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        collected: [],
        nextField: null,
        complete: true,
      };
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
      return { ctx, payload: { action: "book", criteria } };
    }
  }

  // ---- 4. Comparison ------------------------------------------------------
  if (explicitIntent === "compare") {
    let hotels = resolveHotels(lastUserMessage, session.lastRecommendations, intent?.hotelIds);
    if (hotels.length < 2) hotels = session.lastRecommendations.slice(0, 2);
    if (hotels.length >= 2) {
      const priority = detectPriority(lastUserMessage, criteria);
      // Enrich with LIVE data (dated rates, room categories, perks, amenities,
      // dining) so the comparison is grounded in the real API, not placeholders.
      const comparison = await buildLiveComparison(
        hotels.slice(0, 3),
        criteria.checkIn,
        criteria.checkOut,
        priority,
      );
      const ctx: ReplyContext = {
        action: "compare",
        criteria,
        missing: [],
        recommendations: session.lastRecommendations,
        totalFound: session.lastRecommendations.length,
        comparison,
        comparePriority: priority,
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

  // ---- 4b-2. Q&A — a specific factual question about a shown hotel ---------
  if (explicitIntent === "qa" && session.lastRecommendations.length) {
    let focus = route?.targetHotels?.length
      ? resolveByNames(route.targetHotels, session.lastRecommendations)
      : (resolveHotels(lastUserMessage, session.lastRecommendations) as Recommendation[]);
    if (!focus.length) focus = session.lastRecommendations.slice(0, 1);
    const ctx: ReplyContext = {
      action: "qa",
      criteria,
      missing: [],
      recommendations: session.lastRecommendations,
      totalFound: session.lastRecommendations.length,
      focus,
      qaQuestion: route?.question || lastUserMessage,
      learned,
      lastUserMessage,
      user,
    };
    return { ctx, payload: { action: "qa", criteria } };
  }

  // ---- 4b-3. Local area — nearby attractions, dining, cafés, airport ------
  if (explicitIntent === "local") {
    const focusHotel =
      (route?.targetHotels?.length
        ? resolveByNames(route.targetHotels, session.lastRecommendations)
        : (resolveHotels(lastUserMessage, session.lastRecommendations) as Recommendation[]))[0] ??
      session.lastRecommendations[0];
    const city = focusHotel?.city || criteria.destinationLabel?.split(",")[0] || "";
    const key = (focusHotel?.destinationKey || city).toLowerCase().replace(/[^a-z]/g, "");
    const pois = CITY_POIS[key] ?? null;
    const ctx: ReplyContext = {
      action: "local",
      criteria,
      missing: [],
      recommendations: session.lastRecommendations,
      totalFound: session.lastRecommendations.length,
      localArea: { city, hotelName: focusHotel?.name, pois },
      qaQuestion: route?.question || lastUserMessage,
      learned,
      lastUserMessage,
      user,
    };
    return { ctx, payload: { action: "local", criteria } };
  }

  // ---- 4b-4. A whole COUNTRY, not a city — searches are city-based, so ask
  // which city they intend to stay in (skip single-destination countries).
  if (!criteria.destination && !refersToShown) {
    const country = bareCountry(criteria.destinationLabel || "");
    if (country) {
      const ctx: ReplyContext = {
        action: "ask",
        criteria,
        missing: [],
        recommendations: session.lastRecommendations,
        totalFound: session.lastRecommendations.length,
        askCityCountry: country,
        learned,
        lastUserMessage,
        user,
      };
      return { ctx, payload: { action: "ask", criteria } };
    }
  }

  // ---- 4c. Live search — any city beyond the local set, via the API -------
  const liveCity = !criteria.destination
    ? criteria.destinationLabel || heuristicCity(lastUserMessage)
    : undefined;
  if (liveCity) {
    // Remember the named city so a follow-up ("here are my dates") still has it.
    if (criteria.destinationLabel !== liveCity) {
      criteria.destinationLabel = liveCity;
      await sessionStorageService.save(sessionId, { criteria });
    }
    if (criteria.checkIn && criteria.checkOut) {
      let live = await getCityHotels({
        city: liveCity,
        checkIn: criteria.checkIn,
        checkOut: criteria.checkOut,
      });
      // Understand WHY they want this city, then rank the live results by real
      // fit (proximity to the requested anchor + amenity/traveller-type match),
      // filtering out clearly-irrelevant options for strong geographic intents.
      const intent = parseTravelIntent(lastUserMessage, criteria);
      // For a geographic intent, resolve the anchor (curated coords, else a live
      // geocode for any covered city — disambiguated by the city's country) and
      // fetch real coordinates for the candidates so ranking uses true distance.
      let anchor = intent.proximity
        ? await getAnchor(liveCity, intent.proximity, live[0]?.country)
        : null;
      if (anchor) {
        live = await attachLiveCoordinates(live, 12);
        anchor = validateAnchor(anchor, live); // drop a bad geocode → qualitative
      }
      const ranked = rankLiveHotels(live, intent, anchor);
      let liveHotels: import("@/lib/services/live-rates").LiveHotel[] = ranked.slice(0, 9);
      // Enrich the SHOWN hotels with real amenities + on-site dining so each card
      // carries a grounded "why it matches" note (bounded, parallel, cached).
      if (intent.proximity || intent.travelerTypes.length) {
        liveHotels = (await attachLiveInfo(liveHotels, 9)).map((h) => {
          const reason = buildLiveMatchReason(h, intent);
          return reason ? { ...h, matchReason: reason } : h;
        });
      }
      const ctx: ReplyContext = {
        action: "live",
        criteria,
        missing: [],
        recommendations: session.lastRecommendations,
        totalFound: session.lastRecommendations.length,
        liveCity,
        liveHotels,
        liveIntent: summarizeIntent(intent),
        learned,
        lastUserMessage,
        user,
      };
      return { ctx, payload: { action: "live", criteria, liveCity, liveHotels } };
    }
    // Named a city we don't hold locally but no dates yet — ask for them.
    const ctx: ReplyContext = {
      action: "ask",
      criteria,
      missing: ["dates"],
      recommendations: session.lastRecommendations,
      totalFound: 0,
      liveCity,
      learned,
      lastUserMessage,
      user,
    };
    return { ctx, payload: { action: "ask", criteria, missing: ["dates"], liveCity } };
  }

  // ---- 5. Recommend (explicit ask OR enough NEW signal) -------------------
  // Only auto-recommend when the traveller explicitly asks, or when they gave
  // new search criteria this turn, or when nothing's been shown yet — otherwise
  // a plain follow-up would keep re-running the search.
  const SEARCH_FIELDS = new Set([
    "destination", "dates", "budget", "occasion", "amenities", "vibes", "brands", "nearby", "guests",
  ]);
  const changedSearch = learned.some((f) => SEARCH_FIELDS.has(f));
  const shouldRecommend =
    criteria.destination &&
    (explicitIntent === "recommend" ||
      (readyToRecommend(criteria) &&
        (changedSearch || session.lastRecommendations.length === 0)));

  if (shouldRecommend) {
    // Understand WHY they want this city. For a geographic intent we can anchor
    // (near the beach / airport / a landmark), pull a deeper shortlist and
    // re-rank it by real distance; otherwise the engine's fit ranking stands.
    const intent = parseTravelIntent(lastUserMessage, criteria);
    const anchorCity = criteria.destinationLabel || criteria.destination || "";
    const region = anchorCity.includes(",")
      ? anchorCity.split(",").slice(1).join(",").trim()
      : undefined;
    let anchor = intent.proximity ? await getAnchor(anchorCity, intent.proximity, region) : null;
    const wantsGeo = Boolean(anchor);
    const { recommendations: raw, totalFound } = await recommendationService.recommend(
      criteria,
      wantsGeo ? 15 : 5,
    );
    if (anchor) anchor = validateAnchor(anchor, raw); // drop a bad geocode
    const recommendations = anchor
      ? applyIntentRanking(raw, intent, 5, anchor)
      : raw.slice(0, 5);
    await sessionStorageService.save(sessionId, { lastRecommendations: recommendations });
    const ctx: ReplyContext = {
      action: "recommend",
      criteria,
      missing: missingFields(criteria),
      recommendations,
      totalFound,
      liveIntent: summarizeIntent(intent),
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
  // Greetings, thanks, and general "how does this work?" questions get a warm,
  // helpful reply rather than a demand for missing trip details.
  const isChat = isGreeting || routed === "smalltalk";

  const ctx: ReplyContext = {
    action: isChat ? "chat" : "ask",
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

async function continueBooking(
  sessionId: string,
  booking: BookingDraft,
  message: string,
): Promise<{ ctx: ReplyContext; payload: AdvisorPayload }> {
  const field = (booking.nextField as BookingField) ?? nextBookingField(booking.collected);
  if (field) {
    const value = valueForBookingField(field, message);
    (booking as unknown as Record<string, unknown>)[BOOKING_LABEL[field]] = value;
    booking.collected = [...booking.collected, field];
  }
  booking.nextField = nextBookingField(booking.collected);
  booking.complete = booking.nextField === null;
  const session = await sessionStorageService.save(sessionId, { booking });

  const ctx: ReplyContext = {
    action: "book",
    criteria: session.criteria,
    missing: [],
    recommendations: session.lastRecommendations,
    totalFound: 0,
    booking,
    learned: [],
    lastUserMessage: message,
  };
  return { ctx, payload: { action: "book", criteria: ctx.criteria, booking } };
}
