import type { AdvisorAction, BookingDraft } from "@/lib/chat/types";
import type { CriteriaField } from "@/lib/services/conversation-memory";
import type { DestinationInfo } from "@/lib/services/destination-knowledge";
import type { HotelComparison } from "@/lib/services/recommendation-engine";
import type { Recommendation, SearchCriteria } from "@/lib/services/types";

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
  /** Live results + the city they're for, when searching beyond the local set. */
  liveCity?: string;
  liveHotels?: import("@/lib/services/live-rates").LiveHotel[];
  /** Field names just learned this turn, for natural acknowledgements. */
  learned: string[];
  lastUserMessage: string;
  user?: AdvisorUser;
}
