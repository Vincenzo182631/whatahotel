import type { AdvisorAction, BookingDraft } from "@/lib/chat/types";
import type { CriteriaField } from "@/lib/services/conversation-memory";
import type { DestinationInfo } from "@/lib/services/destination-knowledge";
import type { HotelComparison } from "@/lib/services/recommendation-engine";
import type { Recommendation, SearchCriteria } from "@/lib/services/types";
import type { CityPois } from "./itinerary-data";

/** The signed-in traveller, when there is one — used to personalise replies. */
export interface AdvisorUser {
  firstName: string;
  travelerType?: "solo" | "couple" | "family" | "business";
  membership: "free" | "premium";
  lastTripCity?: string;
  upcomingTripCity?: string;
  /** True only on the very first assistant turn of a session (for a warm hello). */
  greet?: boolean;
}

/** Everything the reply generator needs to speak for this turn. */
export interface ReplyContext {
  action: AdvisorAction;
  criteria: SearchCriteria;
  missing: CriteriaField[];
  recommendations: Recommendation[];
  totalFound: number;
  comparison?: HotelComparison;
  booking?: BookingDraft;
  destinationSuggestions?: DestinationInfo[];
  /** The specific hotels the user asked about, for the "explain"/"qa" actions. */
  focus?: Recommendation[];
  /** The exact factual question to answer for the "qa" action. */
  qaQuestion?: string;
  /** What the traveller cares most about, to weight the "compare" recommendation. */
  comparePriority?: string;
  /** For the "local" action: nearby attractions, dining, cafés & transport. */
  localArea?: { city: string; hotelName?: string; pois: CityPois | null };
  /** Live results + the city they're for, when searching beyond the local set. */
  liveCity?: string;
  liveHotels?: import("@/lib/services/live-rates").LiveHotel[];
  /** One-line summary of the traveller's travel intent, when live-ranked. */
  liveIntent?: string;
  /** How many hotels the traveller asked for — so the reply can explain a
   *  shortfall ("only N match your criteria"). */
  requestedCount?: number;
  /** Field names just learned this turn, for natural acknowledgements. */
  learned: string[];
  lastUserMessage: string;
  user?: AdvisorUser;
  /** The traveller's local time of day (morning/afternoon/evening/night). */
  timeOfDay?: string;
  /** True on the first assistant turn — cue for a warm, time-appropriate hello. */
  greet?: boolean;
  /** Set when they named a whole country — ask which city they'll stay in. */
  askCityCountry?: string;
  /** Consultative discovery: a place is known but we still want to understand
   *  the traveller — ask ONE natural preference question (topic hint) before
   *  showing a shortlist. */
  discovery?: "purpose" | "priorities" | "dates";
  /** The traveller is wrapping up — close warmly, ask nothing further. "chosen"
   *  when they've already settled on a hotel, "open" otherwise. */
  farewell?: "open" | "chosen";
}
