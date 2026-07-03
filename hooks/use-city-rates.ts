"use client";

import { useQuery } from "@tanstack/react-query";

export interface DatedRate {
  nightly: number; // all-in per night (total ÷ nights) for the chosen dates
  total: number;
  currency: string;
}

/**
 * Live dated rates for every hotel in a city, in ONE request (method=cityrates),
 * keyed by our slug and the source id. React Query dedupes by (city, dates), so
 * all cards in the same city share a single fetch. Cached 30 min.
 */
export function useCityRates(city: string | undefined, checkIn: string, checkOut: string) {
  return useQuery({
    queryKey: ["city-rates", city, checkIn, checkOut],
    queryFn: async (): Promise<Record<string, DatedRate>> => {
      const res = await fetch(
        `/api/city-rates?city=${encodeURIComponent(city!)}&checkIn=${checkIn}&checkOut=${checkOut}`,
      );
      if (!res.ok) return {};
      const data = await res.json();
      return (data.rates ?? {}) as Record<string, DatedRate>;
    },
    enabled: Boolean(city && checkIn && checkOut),
    staleTime: 30 * 60 * 1000,
  });
}
