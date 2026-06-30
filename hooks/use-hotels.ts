"use client";

import { useQuery } from "@tanstack/react-query";
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

async function fetchHotels(): Promise<{ hotels: Hotel[] }> {
  const res = await fetch("/api/hotels");
  if (!res.ok) throw new Error("Failed to load hotels");
  return res.json();
}

export function useHotels() {
  return useQuery({ queryKey: ["hotels"], queryFn: fetchHotels });
}
