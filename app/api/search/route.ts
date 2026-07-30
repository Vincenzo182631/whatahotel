import { NextResponse } from "next/server";
import {
  getCityHotels,
  attachLiveCoordinates,
  attachLiveInfo,
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
import { parseAskedBrands, brandHotelsForCity } from "@/lib/ai/brands";
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

interface CityInput {
  name: string;
  brand?: string; // per-city brand label (overrides global)
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
          const fetchCity = () => getCityHotels({ city: cityName, checkIn, checkOut, guests: adults });
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
        live = await attachLiveCoordinates(live, 12);
        anchor = validateAnchor(anchor, live);
      }
      const ranked: LiveHotel[] = rankLiveHotels(live, intent, anchor);

      let picks = ranked.slice(0, PER_CITY);
      if (picks.length) {
        picks = (await attachLiveInfo(picks, picks.length)).map((h) => {
          const reason = buildLiveMatchReason(h, intent);
          return reason ? { ...h, matchReason: reason } : h;
        });
      }
      return { city: c.name, brand: brandLabel, hotels: picks, brandMissing: false };
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
