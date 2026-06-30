"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Recommendation } from "@/lib/services/types";

interface SavedHotel {
  id: string;
  name: string;
  city: string;
  image: string;
  startingRate: number;
}

interface PreferencesState {
  saved: SavedHotel[];
  toggleSave: (hotel: Recommendation | SavedHotel) => void;
  isSaved: (id: string) => boolean;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      saved: [],
      toggleSave: (hotel) => {
        const exists = get().saved.some((h) => h.id === hotel.id);
        if (exists) {
          set({ saved: get().saved.filter((h) => h.id !== hotel.id) });
        } else {
          set({
            saved: [
              ...get().saved,
              {
                id: hotel.id,
                name: hotel.name,
                city: hotel.city,
                image: hotel.image,
                startingRate: hotel.startingRate,
              },
            ],
          });
        }
      },
      isSaved: (id) => get().saved.some((h) => h.id === id),
    }),
    { name: "whatahotel-saved" },
  ),
);
