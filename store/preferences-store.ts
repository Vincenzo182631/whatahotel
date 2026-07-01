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
  recentlyViewed: SavedHotel[];
  toggleSave: (hotel: Recommendation | SavedHotel) => void;
  isSaved: (id: string) => boolean;
  addRecentlyViewed: (hotel: Recommendation | SavedHotel) => void;
}

const toSaved = (h: Recommendation | SavedHotel): SavedHotel => ({
  id: h.id,
  name: h.name,
  city: h.city,
  image: h.image,
  startingRate: h.startingRate,
});

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      saved: [],
      recentlyViewed: [],
      toggleSave: (hotel) => {
        const exists = get().saved.some((h) => h.id === hotel.id);
        if (exists) {
          set({ saved: get().saved.filter((h) => h.id !== hotel.id) });
        } else {
          set({ saved: [...get().saved, toSaved(hotel)] });
        }
      },
      isSaved: (id) => get().saved.some((h) => h.id === id),
      addRecentlyViewed: (hotel) => {
        const next = [
          toSaved(hotel),
          ...get().recentlyViewed.filter((h) => h.id !== hotel.id),
        ].slice(0, 8);
        set({ recentlyViewed: next });
      },
    }),
    { name: "whatahotel-saved" },
  ),
);
