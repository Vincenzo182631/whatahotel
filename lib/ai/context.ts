import type { AdvisorAction, BookingDraft } from "@/lib/chat/types";
import type { CriteriaField } from "@/lib/services/conversation-memory";
import type { DestinationInfo } from "@/lib/services/destination-knowledge";
import type { HotelComparison } from "@/lib/services/recommendation-engine";
import type { Recommendation, SearchCriteria } from "@/lib/services/types";

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
  /** Field names just learned this turn, for natural acknowledgements. */
  learned: string[];
  lastUserMessage: string;
}
