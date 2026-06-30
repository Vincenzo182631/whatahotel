import { hotelSearchService } from "./amadeus-hotel-search";
import { titleCase } from "../utils";
import type {
  Hotel,
  Recommendation,
  SearchCriteria,
} from "./types";

/**
 * Recommendation Engine.
 *
 * Scores candidate hotels against the conversation's SearchCriteria and writes
 * a human "why I chose this" for each. This is the brain an LLM would otherwise
 * approximate — keeping it deterministic means recommendations are explainable
 * and reproducible.
 */

const AMENITY_LABELS: Record<string, string> = {
  spa: "a renowned spa",
  pool: "a stand-out pool",
  beachfront: "direct beach access",
  breakfast: "breakfast included",
  michelin: "Michelin-level dining",
  butler: "personal butler service",
  gym: "a serious fitness centre",
  kidsclub: "a kids' club",
  airporttransfer: "airport transfers",
  oceanview: "ocean views",
  rooftop: "a rooftop retreat",
  fireplace: "in-room fireplaces",
  ski: "ski-in / ski-out access",
  casino: "a casino on site",
  connecting: "connecting rooms for the family",
};

const OCCASION_PHRASE: Record<string, string> = {
  anniversary: "you're celebrating an anniversary",
  honeymoon: "this is your honeymoon",
  birthday: "you're marking a birthday",
  wedding: "you're celebrating a wedding",
  family: "you're travelling as a family",
  business: "you're travelling for business",
  wellness: "you're after a wellness reset",
  celebration: "you're celebrating something special",
  leisure: "you're after a proper getaway",
};

// Brand prestige tiers — the ranking baseline (guest ratings aren't published).
const PRESTIGE: Record<string, number> = {
  Aman: 10, "Cheval Blanc": 10, Bvlgari: 10, "Four Seasons": 10, "Ritz-Carlton": 10,
  "Mandarin Oriental": 10, Rosewood: 10, Peninsula: 10, "Park Hyatt": 10, "St. Regis": 10,
  "Waldorf Astoria": 10, Raffles: 10, "Dorchester Collection": 10, "One&Only": 10,
  "Six Senses": 10, Soneva: 10, Belmond: 10, "The Ritz": 10,
  "Shangri-La": 9, Jumeirah: 9, Corinthia: 9, Langham: 9, Taj: 9, Kempinski: 9,
  "Banyan Tree": 9, Regent: 9, "The Luxury Collection": 9, EDITION: 9, Conrad: 9, Faena: 9, Pendry: 9,
  "JW Marriott": 8, Sofitel: 8, Fairmont: 8, Westin: 8, InterContinental: 8, Andaz: 8,
  "Grand Hyatt": 8, "Hyatt Centric": 8, "Hyatt Regency": 8, "Autograph Collection": 8,
  "Le Méridien": 8, Renaissance: 8, Kimpton: 8, Thompson: 8, Loews: 8, "The Standard": 8,
  SLS: 8, LXR: 8, Pullman: 8, Sheraton: 8, "W Hotels": 8, "Tribute Portfolio": 8,
  Marriott: 7.5, Hilton: 7.5, Hyatt: 7.5,
};
function prestige(brand?: string): number {
  if (!brand) return 7;
  return PRESTIGE[brand] ?? 7.5;
}

function scoreHotel(hotel: Hotel, c: SearchCriteria) {
  let score = prestige(hotel.brand) * 8; // brand-prestige baseline (56–80)
  const tags: string[] = [];

  // Budget fit
  if (c.budgetMax) {
    if (hotel.startingRate <= c.budgetMax) {
      score += 16;
      tags.push("within budget");
    } else if (hotel.startingRate <= c.budgetMax * 1.25) {
      score += 7;
      tags.push("a touch above budget");
    }
  } else {
    score += 6;
  }

  // Occasion fit
  if (c.occasion && hotel.goodFor.includes(c.occasion)) {
    score += 14;
    tags.push(`ideal for ${c.occasion}`);
  }

  // Amenities
  const matchedAmenities = (c.amenities ?? []).filter((a) =>
    hotel.amenities.includes(a),
  );
  score += Math.min(matchedAmenities.length * 5, 20);
  matchedAmenities.forEach((a) => tags.push(AMENITY_LABELS[a] ?? a));

  // Vibes
  const matchedVibes = (c.vibes ?? []).filter((v) => hotel.vibes.includes(v));
  score += Math.min(matchedVibes.length * 4, 12);

  // Brand preference
  if (
    c.brands?.some((b) =>
      `${hotel.brand ?? ""} ${hotel.name}`.toLowerCase().includes(b),
    )
  ) {
    score += 16;
    tags.push("your preferred brand");
  }

  // Nearby landmark
  if (c.nearby) {
    const near = c.nearby.toLowerCase();
    const hit = hotel.distances.find((d) => d.label.toLowerCase().includes(near));
    if (hit) {
      score += 8;
      tags.push(`close to ${titleCase(c.nearby)}`);
    }
  }

  return { score: Math.min(Math.round(score), 100), tags, matchedAmenities };
}

function generateReason(
  hotel: Hotel,
  c: SearchCriteria,
  matchedAmenities: string[],
): string {
  const parts: string[] = [];

  if (c.occasion && OCCASION_PHRASE[c.occasion]) {
    parts.push(`you mentioned ${OCCASION_PHRASE[c.occasion]}`);
  }
  if (matchedAmenities.length) {
    const phrases = matchedAmenities.slice(0, 3).map((a) => AMENITY_LABELS[a] ?? a);
    parts.push(
      phrases.length > 1
        ? `${phrases.slice(0, -1).join(", ")} and ${phrases.slice(-1)}`
        : phrases[0],
    );
  }
  if (c.nearby) {
    const hit = hotel.distances.find((d) =>
      d.label.toLowerCase().includes(c.nearby!.toLowerCase()),
    );
    if (hit) parts.push(`it's ${hit.value} from ${titleCase(c.nearby)}`);
  }

  const lead = `I chose ${hotel.name}`;
  if (parts.length === 0) {
    return `${lead} because it's one of the finest addresses in ${hotel.city} — ${hotel.shortPitch.toLowerCase()}`;
  }
  const reasonBody = parts.join(", and it offers ");
  return `${lead} because ${reasonBody}. ${hotel.highlights[0]} seals it.`;
}

/** Map the internal 0–100 match score to a 5.0–10.0 personalised fit score. */
function toFitScore(score: number): number {
  const fit = Math.max(5, Math.min(10, score / 10));
  return Math.round(fit * 10) / 10;
}

export interface RecommendationService {
  recommend(
    criteria: SearchCriteria,
    limit?: number,
  ): Promise<{ recommendations: Recommendation[]; totalFound: number }>;
}

export const recommendationService: RecommendationService = {
  async recommend(criteria, limit = 5) {
    if (!criteria.destination) return { recommendations: [], totalFound: 0 };

    const candidates = await hotelSearchService.searchHotels({
      destinationKey: criteria.destination,
      budgetMax: criteria.budgetMax,
      budgetMin: criteria.budgetMin,
      amenities: criteria.amenities,
      vibes: criteria.vibes,
      occasion: criteria.occasion,
    });

    const scored = candidates
      .map((hotel) => {
        const { score, tags, matchedAmenities } = scoreHotel(hotel, criteria);
        const rec: Recommendation = {
          ...hotel,
          matchScore: score,
          fitScore: toFitScore(score),
          rank: 0, // assigned after sorting
          matchTags: tags,
          reason: generateReason(hotel, criteria, matchedAmenities),
          estimatedTotal: criteria.nights
            ? hotel.startingRate * criteria.nights
            : undefined,
        };
        return rec;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    const recommendations = scored
      .slice(0, limit)
      .map((rec, i) => ({ ...rec, rank: i + 1 }));

    return { recommendations, totalFound: scored.length };
  },
};

// --------------------------------------------------------------------------
// Comparison builder
// --------------------------------------------------------------------------

export interface ComparisonRow {
  label: string;
  values: string[]; // one per hotel, aligned with `hotels`
}

export interface HotelComparison {
  hotels: { id: string; name: string; image: string; city: string }[];
  rows: ComparisonRow[];
  recommendation: string;
}

export function buildComparison(hotels: Hotel[]): HotelComparison {
  const hasRatings = hotels.some((h) => h.rating > 0);
  // Best value = lowest nightly rate when ratings aren't available.
  const bestValueIdx = hotels.reduce(
    (best, h, i) => (h.startingRate > 0 && h.startingRate < hotels[best].startingRate ? i : best),
    0,
  );

  const rows: ComparisonRow[] = [
    { label: "Starting rate / night", values: hotels.map((h) => (h.startingRate ? `$${h.startingRate.toLocaleString()}` : "On request")) },
    { label: "Brand / collection", values: hotels.map((h) => h.brand || "Independent") },
    { label: "Star rating", values: hotels.map((h) => "★".repeat(h.starRating)) },
    { label: "Guest rating", values: hotels.map((h) => (h.rating > 0 ? `${h.rating} (${h.reviewCount.toLocaleString()} reviews)` : "—")) },
    { label: "Location", values: hotels.map((h) => `${h.city}, ${h.country}`) },
    { label: "Advisor perks", values: hotels.map((h) => (h.perks.length ? "Included" : "—")) },
    { label: "Photos", values: hotels.map((h) => `${1 + h.gallery.length}`) },
  ];

  const recommendation = hasRatings
    ? `${hotels[bestValueIdx].name} offers the smartest value of these. Tell me what matters most and I'll make the call.`
    : `On price, ${hotels[bestValueIdx].name} is the best value of these. Pick your dates and I'll pull live rates so you can compare precisely.`;

  return {
    hotels: hotels.map((h) => ({ id: h.id, name: h.name, image: h.image, city: h.city })),
    rows,
    recommendation,
  };
}
