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

function scoreHotel(hotel: Hotel, c: SearchCriteria) {
  let score = hotel.rating * 6; // up to ~60
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

export interface RecommendationService {
  recommend(
    criteria: SearchCriteria,
    limit?: number,
  ): Promise<{ recommendations: Recommendation[]; totalFound: number }>;
}

export const recommendationService: RecommendationService = {
  async recommend(criteria, limit = 4) {
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
          matchTags: tags,
          reason: generateReason(hotel, criteria, matchedAmenities),
          estimatedTotal: criteria.nights
            ? hotel.startingRate * criteria.nights
            : undefined,
        };
        return rec;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      recommendations: scored.slice(0, limit),
      totalFound: scored.length,
    };
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

const has = (h: Hotel, a: string) => (h.amenities.includes(a) ? "Yes" : "—");

export function buildComparison(hotels: Hotel[]): HotelComparison {
  const valueScores = hotels.map(
    (h) => Math.round((h.rating / (h.startingRate / 1000)) * 10) / 10,
  );
  const bestValueIdx = valueScores.indexOf(Math.max(...valueScores));
  const bestRatedIdx = hotels.indexOf(
    hotels.reduce((a, b) => (b.rating > a.rating ? b : a)),
  );

  const rows: ComparisonRow[] = [
    { label: "Starting rate / night", values: hotels.map((h) => `$${h.startingRate.toLocaleString()}`) },
    { label: "Guest rating", values: hotels.map((h) => `${h.rating} (${h.reviewCount.toLocaleString()} reviews)`) },
    { label: "Neighborhood", values: hotels.map((h) => h.neighborhood) },
    { label: "Best for couples", values: hotels.map((h) => (h.vibes.includes("romantic") ? "Excellent" : "Good")) },
    { label: "Family friendly", values: hotels.map((h) => (h.amenities.includes("kidsclub") || h.amenities.includes("connecting") ? "Yes" : "Limited")) },
    { label: "Signature room", values: hotels.map((h) => `${h.name.split(" ")[0]} Signature Suite`) },
    { label: "Dining", values: hotels.map((h) => (h.amenities.includes("michelin") ? "Michelin-level" : "Excellent")) },
    { label: "Spa", values: hotels.map((h) => has(h, "spa")) },
    { label: "Pool", values: hotels.map((h) => has(h, "pool")) },
    { label: "Walking score", values: hotels.map((h) => (h.distances[0]?.value.includes("walk") ? "Very walkable" : "Drive required")) },
    { label: "Advisor perks", values: hotels.map((h) => `${h.perks.length} included`) },
    { label: "Value score", values: valueScores.map((v) => `${v}`) },
  ];

  const recommendation =
    bestValueIdx === bestRatedIdx
      ? `${hotels[bestRatedIdx].name} is my pick — it's both the highest-rated and the best value of the two.`
      : `For outright luxury I'd choose ${hotels[bestRatedIdx].name}; for the smartest value, ${hotels[bestValueIdx].name}. Tell me what matters most and I'll make the call.`;

  return {
    hotels: hotels.map((h) => ({ id: h.id, name: h.name, image: h.image, city: h.city })),
    rows,
    recommendation,
  };
}
