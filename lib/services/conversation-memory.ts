import { resolveDestination, DESTINATIONS } from "./mock-data";
import type { Occasion, SearchCriteria, Vibe } from "./types";

/**
 * Conversation Memory service.
 *
 * Holds the single SearchCriteria the advisor reasons over, merges partial
 * updates (so "actually make it Tokyo" only changes the destination), reports
 * what's still missing, and ships a dependency-free NLU (`parseMessage`) so the
 * advisor is genuinely useful even without an LLM key.
 */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1, couple: 2,
};

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const OCCASION_KEYWORDS: Record<Occasion, string[]> = {
  anniversary: ["anniversary"],
  honeymoon: ["honeymoon", "honey moon", "just married", "newlywed"],
  birthday: ["birthday", "bday"],
  wedding: ["wedding", "getting married", "elopement"],
  family: ["family vacation", "with my kids", "with the kids", "with our children", "family trip"],
  business: ["business trip", "work trip", "conference", "for work", "business travel"],
  wellness: ["wellness", "detox", "retreat", "reset", "relax and recharge"],
  celebration: ["celebrate", "celebrating", "celebration", "special occasion", "milestone"],
  leisure: ["holiday", "vacation", "getaway", "escape"],
};

const AMENITY_KEYWORDS: Record<string, string[]> = {
  spa: ["spa", "massage", "wellness center", "thermal"],
  pool: ["pool", "infinity pool", "swimming"],
  beachfront: ["beachfront", "beach front", "on the beach", "beach resort", "beach"],
  breakfast: ["breakfast included", "breakfast", "free breakfast"],
  michelin: ["michelin", "fine dining", "great restaurant", "amazing food", "gastronomy"],
  butler: ["butler", "personal butler"],
  gym: ["gym", "fitness", "fitness center"],
  kidsclub: ["kids club", "kids' club", "childcare", "kids program", "children's club"],
  airporttransfer: ["airport transfer", "airport transportation", "airport pickup", "transfers"],
  oceanview: ["ocean view", "sea view", "overwater", "water villa"],
  rooftop: ["rooftop", "roof top", "sky bar"],
  fireplace: ["fireplace", "fire place"],
  ski: ["ski", "ski-in", "ski in", "slopes", "skiing"],
  casino: ["casino", "gaming"],
  connecting: ["connecting rooms", "connecting room", "adjoining rooms", "interconnecting"],
};

const VIBE_KEYWORDS: Record<Vibe, string[]> = {
  romantic: ["romantic", "romance", "couple", "intimate", "honeymoon"],
  beach: ["beach", "beachfront", "island", "tropical", "seaside"],
  city: ["city", "urban", "downtown", "city stay", "city break"],
  mountain: ["mountain", "alpine", "ski", "chalet", "slopes"],
  family: ["family", "kids", "children", "family-friendly"],
  business: ["business", "work", "conference", "meeting"],
  wellness: ["wellness", "spa", "retreat", "yoga", "detox"],
  adventure: ["adventure", "explore", "active", "hiking"],
  cruise: ["cruise", "pre-cruise", "before my cruise", "embarkation"],
};

const BRANDS = [
  "aman", "four seasons", "ritz", "ritz-carlton", "mandarin oriental",
  "rosewood", "bulgari", "cheval blanc", "oetker", "waldorf astoria",
  "st regis", "park hyatt", "jumeirah", "raffles", "peninsula", "soneva",
];

function wordToNumber(token: string): number | null {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return NUMBER_WORDS[token] ?? null;
}

function parseBudget(text: string, current: SearchCriteria): Partial<SearchCriteria> {
  const patch: Partial<SearchCriteria> = {};
  const t = text.toLowerCase();
  const tn = t.replace(/,/g, ""); // strip thousands separators

  // Relative change: "increase / raise / bump my budget", "make it cheaper"
  const wantsMore =
    /(increase|raise|bump|push|higher|more|bigger|stretch).{0,18}budget|budget.{0,14}(up|higher|more|bigger)/.test(t);
  const wantsLess =
    /(lower|reduce|decrease|cheaper|less|tighten|drop|smaller).{0,18}budget|budget.{0,14}(down|lower|less|cheaper)/.test(t);

  // Find a rate figure — try strongest signals first so "3 nights" never wins.
  let m =
    tn.match(/\$\s?(\d+(?:\.\d+)?)\s?(k)?/) || // "$1200", "$1.2k"
    tn.match(
      /(\d+(?:\.\d+)?)\s?(k)?\s*(?:\/\s*night|per\s*night|a\s*night|nightly|usd|dollars|euros?)/,
    ) || // "1200 a night"
    tn.match(/(\d+(?:\.\d+)?)\s?k\b/) || // "1.2k"
    tn.match(/budget[^\d]{0,15}(\d+(?:\.\d+)?)\s?(k)?/) || // "budget of 900"
    tn.match(
      /(?:under|up ?to|below|max(?:imum)?|around|about|approx\w*|spend)\s*\$?\s*(\d+(?:\.\d+)?)\s?(k)?/,
    ); // "under 700"

  let amount: number | null = null;
  if (m) {
    amount = parseFloat(m[1]);
    const hasK = m[2] === "k" || /\d\s?k\b/.test(m[0]);
    if (hasK && amount < 100) amount *= 1000; // 1.2k -> 1200
  }

  if (amount && amount >= 50) {
    if (/at least|minimum|over|above|from\b/.test(t)) patch.budgetMin = Math.round(amount);
    else patch.budgetMax = Math.round(amount);
  } else if (wantsMore && current.budgetMax) {
    patch.budgetMax = Math.round((current.budgetMax * 1.4) / 50) * 50;
  } else if (wantsLess && current.budgetMax) {
    patch.budgetMax = Math.round((current.budgetMax * 0.7) / 50) * 50;
  }
  return patch;
}

function parseGuests(text: string): Partial<SearchCriteria> {
  const patch: Partial<SearchCriteria> = {};
  const t = text.toLowerCase();

  const childMatch = t.match(/(\d+|one|two|three|four|five|six)\s+(?:children|kids|child)/);
  if (childMatch) patch.children = wordToNumber(childMatch[1]) ?? undefined;
  else if (/\bno kids\b|just (the )?two of us|adults only/.test(t)) patch.children = 0;

  const adultMatch = t.match(/(\d+|one|two|three|four|five|six)\s+adults?/);
  if (adultMatch) patch.adults = wordToNumber(adultMatch[1]) ?? undefined;
  else if (/(my (wife|husband|partner|spouse|fianc)|me and my|the two of us|couple)/.test(t))
    patch.adults = 2;
  else if (/\b(solo|just me|by myself|alone)\b/.test(t)) patch.adults = 1;

  const familyOf = t.match(/family of (\d+|two|three|four|five|six)/);
  if (familyOf) {
    const total = wordToNumber(familyOf[1]) ?? 0;
    if (total >= 3) {
      patch.adults = 2;
      patch.children = total - 2;
    }
  }
  return patch;
}

/**
 * Turn a free-text message into a criteria patch, given what we already know.
 * Only fields that are confidently detected are returned, so merging never
 * clobbers prior context.
 */
export function parseMessage(
  text: string,
  current: SearchCriteria,
): Partial<SearchCriteria> {
  const t = ` ${text.toLowerCase()} `;
  const patch: Partial<SearchCriteria> = {};

  // Destination
  const dest = resolveDestination(text);
  if (dest && dest !== current.destination) {
    patch.destination = dest;
    patch.destinationLabel = DESTINATIONS[dest].label;
  }

  // Nights
  const nights = t.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+nights?/);
  if (nights) patch.nights = wordToNumber(nights[1].trim()) ?? undefined;

  // Travel month
  const month = MONTHS.find((m) => t.includes(` ${m} `) || t.includes(`in ${m}`));
  if (month) patch.travelMonth = month.charAt(0).toUpperCase() + month.slice(1);

  // Budget + guests
  Object.assign(patch, parseBudget(text, current));
  Object.assign(patch, parseGuests(text));

  // Occasion (first match wins)
  for (const [occ, kws] of Object.entries(OCCASION_KEYWORDS) as [Occasion, string[]][]) {
    if (kws.some((k) => t.includes(k))) {
      patch.occasion = occ;
      break;
    }
  }

  // Amenities (accumulate onto existing)
  const foundAmenities = new Set(current.amenities ?? []);
  let amenityChanged = false;
  for (const [key, kws] of Object.entries(AMENITY_KEYWORDS)) {
    if (kws.some((k) => t.includes(k)) && !foundAmenities.has(key)) {
      foundAmenities.add(key);
      amenityChanged = true;
    }
  }
  if (amenityChanged) patch.amenities = [...foundAmenities];

  // Vibes
  const foundVibes = new Set(current.vibes ?? []);
  let vibeChanged = false;
  for (const [key, kws] of Object.entries(VIBE_KEYWORDS) as [Vibe, string[]][]) {
    if (kws.some((k) => t.includes(k)) && !foundVibes.has(key)) {
      foundVibes.add(key);
      vibeChanged = true;
    }
  }
  if (vibeChanged) patch.vibes = [...foundVibes];

  // Brands
  const foundBrands = new Set(current.brands ?? []);
  let brandChanged = false;
  for (const b of BRANDS) {
    if (t.includes(b) && !foundBrands.has(b)) {
      foundBrands.add(b);
      brandChanged = true;
    }
  }
  if (brandChanged) patch.brands = [...foundBrands];

  // Nearby landmark: "near the Eiffel Tower", "close to the Louvre"
  const nearby = text.match(
    /(?:near(?:by)?|close to|walking distance (?:to|of)|next to)\s+(?:the\s+)?([A-Za-z' ]{3,40}?)(?:[.,!?]|$| with | and | in | under )/i,
  );
  if (nearby) {
    const landmark = nearby[1].trim();
    if (landmark.length > 2) patch.nearby = landmark.replace(/\s+/g, " ");
  }

  return patch;
}

/** Merge a patch into criteria — patch values win, undefined is ignored. */
export function mergeCriteria(
  current: SearchCriteria,
  patch: Partial<SearchCriteria>,
): SearchCriteria {
  const next = { ...current } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== null) {
      next[k] = v;
    }
  }
  // Notes accumulate (deduped) so a stated preference is never forgotten.
  if (patch.notes?.length) {
    const merged = [...(current.notes ?? []), ...patch.notes]
      .map((s) => s.trim())
      .filter(Boolean);
    next.notes = [...new Set(merged)].slice(-12);
  }
  // If the destination changed, a previously-set landmark may no longer apply.
  if (patch.destination && patch.destination !== current.destination && !patch.nearby) {
    next.nearby = undefined;
  }
  return next as SearchCriteria;
}

export type CriteriaField =
  | "destination"
  | "dates"
  | "budget"
  | "occasion"
  | "guests";

/** Which high-value details are still unknown (in the order to ask). */
export function missingFields(c: SearchCriteria): CriteriaField[] {
  const missing: CriteriaField[] = [];
  if (!c.destination) missing.push("destination");
  if (!c.travelMonth && !c.checkIn && !c.nights) missing.push("dates");
  if (!c.budgetMax && !c.budgetMin) missing.push("budget");
  if (!c.occasion && !(c.vibes && c.vibes.length)) missing.push("occasion");
  if (!c.adults) missing.push("guests");
  return missing;
}

/** Enough signal to make confident recommendations. */
export function readyToRecommend(c: SearchCriteria): boolean {
  if (!c.destination) return false;
  const known = [
    c.travelMonth || c.checkIn || c.nights,
    c.budgetMax || c.budgetMin,
    c.occasion || (c.vibes && c.vibes.length),
    c.adults,
    c.amenities && c.amenities.length,
  ].filter(Boolean).length;
  return known >= 2;
}
