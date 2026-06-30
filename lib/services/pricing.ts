import type { Hotel } from "./types";

/**
 * Pricing service. Computes nightly + total trip pricing, taxes and the
 * advisor-rate saving versus public rate. Replace with the live Pricing API.
 */
export interface PriceQuote {
  nights: number;
  nightlyRate: number;
  publicRate: number; // what an OTA would charge
  subtotal: number;
  taxesAndFees: number;
  total: number;
  advisorSaving: number;
  currency: string;
}

export interface PricingService {
  quote(hotel: Hotel, nights: number, nightlyRate?: number): PriceQuote;
}

const TAX_RATE = 0.14;
const ADVISOR_DISCOUNT = 0.08; // advisor rate vs. public

export const pricingService: PricingService = {
  quote(hotel, nights, nightlyRate) {
    const n = Math.max(1, nights || 1);
    const nightly = nightlyRate ?? hotel.startingRate;
    const publicRate = Math.round(nightly / (1 - ADVISOR_DISCOUNT));
    const subtotal = nightly * n;
    const taxesAndFees = Math.round(subtotal * TAX_RATE);
    const total = subtotal + taxesAndFees;
    const advisorSaving = (publicRate - nightly) * n;
    return {
      nights: n,
      nightlyRate: nightly,
      publicRate,
      subtotal,
      taxesAndFees,
      total,
      advisorSaving,
      currency: hotel.currency,
    };
  },
};
