/**
 * Service registry — the single import surface for the WhataHotel advisor's
 * backend. Every service is modular and replaceable; nothing in the UI imports
 * a vendor SDK directly.
 *
 *   Amadeus Hotel Search ....... hotelSearchService
 *   Hotel Details .............. hotelDetailsService
 *   Room Availability .......... roomAvailabilityService
 *   Pricing .................... pricingService
 *   Images ..................... imagesService
 *   Advisor Perks .............. advisorPerksService
 *   Destination Knowledge ...... destinationKnowledgeService
 *   Conversation Memory ........ parseMessage / mergeCriteria / ...
 *   Recommendation Engine ...... recommendationService / buildComparison
 *   User Session Storage ....... sessionStorageService
 */

export * from "./types";
export { hotelSearchService } from "./amadeus-hotel-search";
export { hotelDetailsService } from "./hotel-details";
export { roomAvailabilityService } from "./room-availability";
export { pricingService } from "./pricing";
export type { PriceQuote } from "./pricing";
export { imagesService, fallbackImage } from "./images";
export { advisorPerksService } from "./advisor-perks";
export { destinationKnowledgeService } from "./destination-knowledge";
export type { DestinationInfo } from "./destination-knowledge";
export {
  parseMessage,
  mergeCriteria,
  missingFields,
  readyToRecommend,
} from "./conversation-memory";
export type { CriteriaField } from "./conversation-memory";
export {
  recommendationService,
  buildComparison,
} from "./recommendation-engine";
export type { HotelComparison, ComparisonRow } from "./recommendation-engine";
export { sessionStorageService } from "./session-storage";
export type { SessionState } from "./session-storage";
export { DESTINATIONS, HOTELS, resolveDestination } from "./mock-data";
