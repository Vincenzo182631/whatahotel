import { NextResponse } from "next/server";
import {
  getCityHotelsBeachAware,
  attachLiveCoordinates,
  attachLiveInfo,
  detectAmenityKeys,
  type LiveHotel,
} from "@/lib/services/live-rates";
import {
  parseTravelIntent,
  rankLiveHotels,
  getAnchor,
  validateAnchor,
  buildLiveMatchReason,
  summarizeIntent,
} from "@/lib/ai/travel-intent";
import { parseAskedBrands, brandHotelsForCity, brandOfHotelName } from "@/lib/ai/brands";
import { rateLimitExceeded } from "@/lib/security/rate-limit";
import type { SearchCriteria } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const clean = (v: unknown, max = 80) => String(v ?? "").trim().slice(0, max);
const MAX_CITIES = 3;
const PER_CITY = 3;

// Structured preference → natural-language phrase, so the SAME intent parser the
// chat uses (proximity, traveller type, price) drives the ranking.
const LOCATION_PHRASE: Record<string, string> = {
  beach: "near the beach",
  waterfront: "near the water",
  downtown: "downtown",
  airport: "near the airport",
  "theme park": "near the theme parks",
  "major attractions": "near the main attractions",
  nightlife: "near the nightlife",
  restaurants: "near great restaurants",
  shopping: "near the shopping",
  mountain: "in the mountains",
  "ski resort": "near the ski slopes",
  "convention centre": "near the convention centre",
};
const TYPE_PHRASE: Record<string, string> = {
  luxury: "luxury",
  resort: "resort",
  boutique: "boutique",
  "family-friendly": "family-friendly",
  business: "business",
  "adults-only": "adults-only and quiet",
  "beach resort": "beachfront resort",
};
const TRAVELER_PHRASE: Record<string, string> = {
  solo: "solo",
  couple: "for a couple",
  family: "with the family",
  business: "on business",
  group: "for a group",
  friends: "with friends",
  honeymoon: "for a honeymoon",
};

// Form amenity label → canonical amenity key (matches detectAmenityKeys output).
// "dining" is checked against the hotel's on-site restaurants, not amenities.
const FORM_AMENITY_KEY: Record<string, string> = {
  spa: "spa",
  pool: "pool",
  gym: "gym",
  casino: "casino",
  "beach access": "beachfront",
  "kids' facilities": "kidsclub",
  golf: "golf",
  parking: "parking",
  "pet-friendly": "pet",
  restaurant: "dining",
};
const AMENITY_LABEL: Record<string, string> = {
  spa: "spa",
  pool: "pool",
  gym: "gym",
  casino: "casino",
  beachfront: "beach access",
  oceanview: "ocean view",
  kidsclub: "kids' facilities",
  golf: "golf",
  parking: "parking",
  pet: "pet-friendly",
  dining: "great restaurants",
  rooftop: "rooftop",
  breakfast: "breakfast",
  michelin: "Michelin dining",
  butler: "butler service",
  ski: "skiing",
};

interface CityInput {
  name: string;
  brand?: string; // per-city brand label (overrides global)
}

/** Parse a distance label like "~531 m from South Beach" / "~9.3 km" to km. */
function parseKm(label?: string): number | null {
  if (!label) return null;
  const m = label.match(/~?\s*([\d.]+)\s*(m|km)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2].toLowerCase() === "m" ? v / 1000 : v;
}
// Beach-district city names, so a beachfront hotel is recognised even when its
// info text and distance-to-one-anchor don't prove it (e.g. Bali's many beaches).
const BEACH_CITY_RE =
  /beach|seminyak|nusa dua|jimbaran|kuta|uluwatu|canggu|sanur|waikiki|south beach|surf club|palm beach|malibu|santa monica|riviera|cancun|tulum/i;

/** Is this hotel GENUINELY beachfront? Any strong signal counts, since no single
 *  one is reliable: the beachfront amenity, sitting within ~3 km of the beach
 *  anchor, or being in a beach-district city. */
function isBeachfront(h: LiveHotel): boolean {
  if ((h.amenities ?? []).includes("beachfront")) return true;
  const km = parseKm(h.distanceLabel);
  if (km != null && km <= 3) return true;
  return BEACH_CITY_RE.test(h.city ?? "");
}

export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "form-search", 20, 60)) {
    return NextResponse.json({ error: "Too many searches — one moment." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));

  const rawCities: CityInput[] = Array.isArray(body.cities) ? body.cities : [];
  const cities = rawCities
    .map((c) => ({ name: clean(c?.name), brand: clean(c?.brand, 40) || undefined }))
    .filter((c) => c.name)
    .slice(0, MAX_CITIES);
  if (!cities.length) {
    return NextResponse.json({ error: "Enter at least one city." }, { status: 400 });
  }

  const checkIn = clean(body.checkIn, 10);
  const checkOut = clean(body.checkOut, 10);
  const globalBrand = clean(body.brand, 40) || undefined;
  const adults = Math.max(1, Number(body.adults) || 2);
  const children = Math.max(0, Number(body.children) || 0);
  const budgetMax = Number(body.budgetMax) || undefined;
  const budgetMin = Number(body.budgetMin) || undefined;
  const hotelType = clean(body.hotelType, 30) || undefined;
  const amenities: string[] = Array.isArray(body.amenities)
    ? body.amenities.map((a: unknown) => clean(a, 24)).filter(Boolean).slice(0, 12)
    : [];
  const locationPref = clean(body.locationPref, 30) || undefined;
  const travelerType = clean(body.travelerType, 20) || undefined;
  const notes = clean(body.notes, 400) || undefined;

  // One shared intent applies to every city.
  const intentBits: string[] = [];
  if (hotelType) intentBits.push(TYPE_PHRASE[hotelType] ?? hotelType);
  if (locationPref) intentBits.push(LOCATION_PHRASE[locationPref] ?? `near the ${locationPref}`);
  if (amenities.length) intentBits.push(`with a ${amenities.join(", ")}`);
  if (travelerType) intentBits.push(TRAVELER_PHRASE[travelerType] ?? `for ${travelerType}`);
  if (budgetMax) intentBits.push(`under $${budgetMax} a night`);
  if (notes) intentBits.push(notes);
  const intentText = intentBits.join(", ");

  const criteria: SearchCriteria = {
    adults,
    children: children || undefined,
    budgetMin,
    budgetMax,
    amenities: amenities.length ? amenities : undefined,
  };
  const intent = parseTravelIntent(intentText, criteria);

  // The full set of amenity/feature preferences to score hotels against — the
  // checked amenities PLUS anything extracted from the free-text and location.
  const requestedKeys = new Set<string>();
  for (const a of amenities) {
    const key = FORM_AMENITY_KEY[a.toLowerCase()];
    if (key) requestedKeys.add(key);
  }
  for (const k of detectAmenityKeys(notes ?? "")) requestedKeys.add(k);
  if (locationPref === "beach" || locationPref === "waterfront") requestedKeys.add("beachfront");
  const PREF_POINTS = 16; // each matched preference beats a small distance edge

  // Score an ENRICHED hotel by how many stated preferences it actually has.
  const scorePrefs = (h: LiveHotel): { bonus: number; matched: string[] } => {
    const has = new Set(h.amenities ?? []);
    let bonus = 0;
    const matched: string[] = [];
    for (const key of requestedKeys) {
      const ok = key === "dining" ? (h.dining?.length ?? 0) > 0 : has.has(key);
      if (ok) {
        bonus += PREF_POINTS;
        matched.push(AMENITY_LABEL[key] ?? key);
      }
    }
    if (hotelType === "luxury" && brandOfHotelName(h.name)) bonus += 6; // luxury flag
    return { bonus, matched };
  };

  const groups = await Promise.all(
    cities.map(async (c) => {
      const brandLabel = c.brand || globalBrand;
      const brand = brandLabel ? parseAskedBrands(brandLabel)[0] : undefined;
      const cityName = c.name.split(",")[0].trim();

      // For a brand, scan the catalogue by name (finds flagships the city rate-
      // list omits); otherwise use the city rate list. Missing dates → nothing.
      let live: LiveHotel[] = [];
      if (checkIn && checkOut) {
        if (brand) {
          live = await brandHotelsForCity({
            brandLabel: brand.label,
            brandKey: brand.key,
            city: cityName,
            checkIn,
            checkOut,
            guests: adults,
          });
        } else {
          const includeBeach =
            intent.proximity?.kind === "beach" ||
            /beach|water|ocean|coast/i.test((intent.proximity?.label ?? "") + " " + (locationPref ?? ""));
          const fetchCity = () =>
            getCityHotelsBeachAware({ city: cityName, checkIn, checkOut, guests: adults, includeBeach });
          live = await fetchCity();
          if (!live.length) live = await fetchCity();
        }
      }
      if (!live.length) {
        // A named brand with no property vs the city simply being empty.
        return { city: c.name, brand: brandLabel, hotels: [] as LiveHotel[], brandMissing: Boolean(brand), empty: !brand };
      }

      let anchor = intent.proximity ? await getAnchor(cityName, intent.proximity, live[0]?.country) : null;
      if (anchor) {
        live = await attachLiveCoordinates(live, 18);
        anchor = validateAnchor(anchor, live);
      }
      const ranked: LiveHotel[] = rankLiveHotels(live, intent, anchor);

      // Enrich a CANDIDATE POOL (not just the top 3) with real amenities/dining,
      // then re-rank by how well each hotel matches the stated preferences — so a
      // spa/pool hotel further down can rise above a closer one that lacks them.
      const beachIntent =
        intent.proximity?.kind === "beach" || /beach|waterfront|water/i.test(locationPref ?? "");
      const pool = ranked.slice(0, requestedKeys.size || beachIntent ? 10 : PER_CITY);
      const enriched = await attachLiveInfo(pool, pool.length);
      const scored = enriched.map((h) => {
        const { bonus, matched } = scorePrefs(h);
        // For a beach request, a hotel that is GENUINELY on a beach (by any
        // signal) is the point — rank it first regardless of which specific beach
        // the anchor happened to be, so multi-beach destinations aren't distorted.
        const bf = beachIntent && isBeachfront(h);
        const beachBonus = bf ? 60 : 0;
        if (bf && !matched.includes("beach access")) matched.unshift("beachfront");
        const proximityReason = buildLiveMatchReason(h, intent);
        const reason = [proximityReason, matched.length ? `has ${matched.join(", ")}` : ""]
          .filter(Boolean)
          .join(" · ");
        return {
          hotel: reason ? { ...h, matchReason: reason } : h,
          total: (h.relevanceScore ?? 0) + bonus + beachBonus,
          beachfront: bf,
        };
      });
      scored.sort((a, b) => b.total - a.total);
      const top = scored.slice(0, PER_CITY);
      const picks = top.map((s) => s.hotel);
      // Preference could NOT be met: a beach was asked for but nothing here is
      // genuinely beachfront — tell the traveller instead of pretending.
      const note =
        beachIntent && !top.some((s) => s.beachfront)
          ? `We couldn't find genuinely beachfront hotels in ${cityName} for these dates — showing the closest luxury options instead.`
          : undefined;
      return { city: c.name, brand: brandLabel, hotels: picks, brandMissing: false, note };
    }),
  );

  return NextResponse.json({
    summary: {
      cities: cities.map((c) => ({ name: c.name, brand: c.brand || globalBrand })),
      checkIn,
      checkOut,
      brand: globalBrand,
      adults,
      children,
      budgetMin,
      budgetMax,
      hotelType,
      amenities,
      locationPref,
      travelerType,
      notes,
      intent: summarizeIntent(intent),
    },
    groups,
  });
}
