import type { CriteriaField } from "@/lib/services/conversation-memory";
import type { HotelComparison } from "@/lib/services/recommendation-engine";
import type { LiveHotel } from "@/lib/services/live-rates";
import type { Recommendation, SearchCriteria } from "@/lib/services/types";
import type { BeachAlert } from "@/lib/services/beach-intelligence";

/** What the advisor decided to do this turn. */
export type AdvisorAction =
  | "ask"
  | "recommend"
  | "compare"
  | "book"
  | "chat"
  | "explain"
  | "live"
  | "qa"
  | "local";

export interface BookingDraft {
  hotelId?: string;
  hotelName?: string;
  guestName?: string;
  email?: string;
  phone?: string;
  bedPreference?: string;
  specialRequests?: string;
  arrivalTime?: string;
  collected: string[];
  nextField?: string | null;
  complete: boolean;
}

/** The structured payload streamed after the assistant's prose. */
export interface AdvisorPayload {
  action: AdvisorAction;
  criteria: SearchCriteria;
  recommendations?: Recommendation[];
  totalFound?: number;
  comparison?: HotelComparison;
  missing?: CriteriaField[];
  booking?: BookingDraft;
  /** Live results for a city outside the local set (link out to WhataHotel). */
  liveHotels?: LiveHotel[];
  liveCity?: string;
  /** Sargassum warning for a mentioned destination (score ≤ 60 or worsening). */
  beachAlert?: BeachAlert;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload?: AdvisorPayload;
  streaming?: boolean;
  /** Contextual loading text shown while the reply is being prepared. */
  loadingLabel?: string;
  /** True when this reply came from a human agent (not the AI). */
  fromAgent?: boolean;
}

export interface ChatRequestBody {
  sessionId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  /** Optional structured intent from a UI affordance (e.g. a card button). */
  intent?: {
    type: "compare" | "book" | "details";
    hotelIds?: string[];
  };
  /** Durable traveller preferences shared across every chatbot on the site. */
  memory?: string[];
  /** The traveller's local time of day (morning/afternoon/evening/night) for a natural greeting. */
  timeOfDay?: string;
}

/** SSE event shapes streamed by /api/chat. */
export type StreamEvent =
  | { type: "text"; value: string }
  | { type: "final"; payload: AdvisorPayload };
