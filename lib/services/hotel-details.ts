import { HOTELS } from "./mock-data";
import type { Hotel } from "./types";

/**
 * Hotel Details service — single-property lookup.
 * Replace `getHotelById` with an Amadeus Hotel Details call when wired to live
 * inventory; the return shape stays identical.
 */
export interface HotelDetailsService {
  getHotelById(id: string): Promise<Hotel | null>;
  getAllHotels(): Promise<Hotel[]>;
}

export const hotelDetailsService: HotelDetailsService = {
  async getHotelById(id) {
    return HOTELS.find((h) => h.id === id) ?? null;
  },
  async getAllHotels() {
    return HOTELS;
  },
};
