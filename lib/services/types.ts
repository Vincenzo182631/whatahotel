/**
 * Shared domain types for the WhataHotel advisor.
 *
 * These are intentionally provider-agnostic. The service layer maps Amadeus /
 * WhataHotel payloads into these shapes so the UI and the recommendation
 * engine never depend on a vendor format.
 */

export type Occasion =
  | "anniversary"
  | "honeymoon"
  | "birthday"
  | "wedding"
  | "family"
  | "business"
  | "wellness"
  | "celebration"
  | "leisure";

export type Vibe =
  | "romantic"
  | "beach"
  | "city"
  | "mountain"
  | "family"
  | "business"
  | "wellness"
  | "adventure"
  | "cruise";

/**
 * The single source of truth the advisor reasons over. The conversation
 * progressively fills this in; the AI only ever asks for fields that are
 * still missing, and modifications patch individual fields.
 */
export interface SearchCriteria {
  destination?: string; // canonical city key, e.g. "paris"
  destinationLabel?: string; // human label, e.g. "Paris, France"
  checkIn?: string;
  checkOut?: string;
  travelMonth?: string;
  nights?: number;
  adults?: number;
  children?: number;
  budgetMin?: number; // per night, USD
  budgetMax?: number; // per night, USD
  occasion?: Occasion;
  brands?: string[];
  amenities?: string[]; // canonical amenity keys
  vibes?: Vibe[];
  nearby?: string; // landmark / point of interest
}

export interface RoomOption {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  bedType: string;
  view?: string;
  refundable: boolean;
  maxOccupancy: number;
}

export interface AdvisorPerk {
  id: string;
  label: string;
  detail: string;
}

export interface Hotel {
  id: string;
  name: string;
  brand?: string;
  city: string;
  destinationKey: string;
  country: string;
  neighborhood: string;
  shortPitch: string;
  description: string;
  image: string;
  gallery: string[];
  rating: number; // 0-10
  reviewCount: number;
  starRating: number; // 1-5
  startingRate: number; // per night, USD
  currency: string;
  amenities: string[]; // canonical keys
  highlights: string[]; // marketing bullets
  perks: AdvisorPerk[]; // advisor-exclusive benefits
  vibes: Vibe[];
  goodFor: Occasion[];
  distances: { label: string; value: string }[];
  coordinates: { lat: number; lng: number };
}

/** A hotel plus the advisor's reasoning for surfacing it. */
export interface Recommendation extends Hotel {
  reason: string; // human "why I chose this"
  matchScore: number; // 0-100
  matchTags: string[]; // the criteria this hotel satisfies
  estimatedTotal?: number; // for the trip, if nights known
}

export interface HotelSearchParams {
  destinationKey: string;
  budgetMax?: number;
  budgetMin?: number;
  amenities?: string[];
  vibes?: Vibe[];
  occasion?: Occasion;
}

export interface RoomAvailability {
  hotelId: string;
  available: boolean;
  rooms: RoomOption[];
}
