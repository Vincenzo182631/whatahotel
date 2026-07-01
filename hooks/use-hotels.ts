"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import type { AdvisorPerk, Hotel, RoomOption } from "@/lib/services/types";
import type { PriceQuote } from "@/lib/services/pricing";

export interface HotelBundle {
  hotel: Hotel;
  gallery: string[];
  rooms: RoomOption[];
  perks: AdvisorPerk[];
  quote: PriceQuote;
}

async function fetchBundle(id: string, nights: number): Promise<HotelBundle> {
  const res = await fetch(`/api/hotels?id=${encodeURIComponent(id)}&nights=${nights}`);
  if (!res.ok) throw new Error("Failed to load hotel");
  return res.json();
}

/** React Query: full hotel bundle (rooms, perks, pricing) for the details page. */
export function useHotelBundle(id: string, nights = 3) {
  return useQuery({
    queryKey: ["hotel-bundle", id, nights],
    queryFn: () => fetchBundle(id, nights),
    enabled: Boolean(id),
  });
}

/**
 * React Query: live entry-level rates for several hotels at once, keyed on the
 * chosen number of nights. Used by the side-by-side comparison. Disabled until
 * `enabled` (i.e. valid dates) so no rates are fetched before dates are picked.
 */
export function useCompareRates(ids: string[], nights: number, enabled: boolean) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["compare-rate", id, nights],
      queryFn: () => fetchBundle(id, nights),
      enabled: enabled && Boolean(id) && nights > 0,
      staleTime: 5 * 60_000,
    })),
  });
}

async function fetchHotels(): Promise<{ hotels: Hotel[] }> {
  const res = await fetch("/api/hotels");
  if (!res.ok) throw new Error("Failed to load hotels");
  return res.json();
}

export function useHotels() {
  return useQuery({ queryKey: ["hotels"], queryFn: fetchHotels });
}

export interface FeaturedHotel {
  id: string;
  name: string;
  brand?: string;
  city: string;
  country: string;
  image: string;
  startingRate: number;
  starRating: number;
  rating: number;
}

export function useFeaturedHotels() {
  return useQuery({
    queryKey: ["featured-hotels"],
    queryFn: async (): Promise<{ hotels: FeaturedHotel[] }> => {
      const res = await fetch("/api/hotels?featured=1");
      if (!res.ok) throw new Error("Failed to load featured hotels");
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}
