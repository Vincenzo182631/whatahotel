import { hotelDetailsService } from "./hotel-details";
import type { AdvisorPerk } from "./types";

/**
 * Advisor Perks service — WhataHotel's advisor-exclusive benefits per property
 * (the value an OTA can't offer). Replace with the WhataHotel Perks API.
 */
export interface AdvisorPerksService {
  getPerks(hotelId: string): Promise<AdvisorPerk[]>;
}

const useLivePerks = Boolean(process.env.WHATAHOTEL_PERKS_API_URL);

export const advisorPerksService: AdvisorPerksService = {
  async getPerks(hotelId) {
    if (useLivePerks) {
      // TODO: fetch from WHATAHOTEL_PERKS_API_URL with WHATAHOTEL_PERKS_API_KEY
    }
    const hotel = await hotelDetailsService.getHotelById(hotelId);
    return hotel?.perks ?? [];
  },
};
