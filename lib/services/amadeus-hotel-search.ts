import { HOTELS } from "./mock-data";
import type { Hotel, HotelSearchParams } from "./types";

/**
 * Amadeus Hotel Search service.
 *
 * Modular + replaceable: when AMADEUS credentials are configured, swap the body
 * of `searchHotels` for a live Amadeus call and map the response into `Hotel`.
 * Everything downstream (recommendation engine, UI) is vendor-agnostic.
 */

export interface HotelSearchService {
  searchHotels(params: HotelSearchParams): Promise<Hotel[]>;
}

const useLiveAmadeus = Boolean(
  process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET,
);

async function searchMock(params: HotelSearchParams): Promise<Hotel[]> {
  let results = HOTELS.filter((h) => h.destinationKey === params.destinationKey);

  if (params.budgetMax) {
    // Keep hotels within ~25% above budget — an advisor stretches a little.
    results = results.filter((h) => h.startingRate <= params.budgetMax! * 1.25);
  }
  if (params.budgetMin) {
    results = results.filter((h) => h.startingRate >= params.budgetMin! * 0.85);
  }
  return results;
}

async function searchLive(params: HotelSearchParams): Promise<Hotel[]> {
  // TODO: integrate Amadeus Hotel List + Search.
  //   1. POST {AMADEUS_BASE_URL}/v1/security/oauth2/token  -> access_token
  //   2. GET  /v1/reference-data/locations/hotels/by-city  -> hotelIds
  //   3. GET  /v3/shopping/hotel-offers?hotelIds=...        -> offers
  //   4. map offers -> Hotel[]
  // For now we delegate to the mock so the product runs end-to-end.
  return searchMock(params);
}

export const hotelSearchService: HotelSearchService = {
  searchHotels: useLiveAmadeus ? searchLive : searchMock,
};
