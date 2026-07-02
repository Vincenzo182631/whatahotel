"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The traveller's check-in / check-out, remembered across the whole app and
 * persisted to localStorage. Once the guest enters dates anywhere (search,
 * compare, a hotel or stay page), they prefill everywhere else so they never
 * have to re-enter them.
 */
interface TravelDatesState {
  checkIn: string;
  checkOut: string;
  setDates: (checkIn: string, checkOut: string) => void;
}

export const useTravelDates = create<TravelDatesState>()(
  persist(
    (set) => ({
      checkIn: "",
      checkOut: "",
      setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),
    }),
    { name: "whatahotel-dates" },
  ),
);
