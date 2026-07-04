"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { extractPreferences } from "@/lib/chat/preferences";

/**
 * Shared traveller memory — the durable things the guest has told ANY chatbot,
 * remembered across conversations and across every advisor on the site (the
 * hotel-page advisor, the compare advisor and the main chat all read + write it).
 * Persisted to localStorage so it survives reloads and return visits.
 *
 * It holds short preference notes, not full transcripts, so every chatbot can
 * open already knowing the guest (honeymoon, kids, budget, dietary…) and never
 * re-ask what they've already said.
 */
interface TravelerMemoryState {
  notes: string[];
  /** Extract + remember durable preferences from a user message. */
  learn: (text: string) => void;
  /** Remember an explicit note. */
  remember: (note: string) => void;
  clear: () => void;
}

const MAX_NOTES = 24;

function mergeNotes(existing: string[], incoming: string[]): string[] {
  const merged = [...existing];
  for (const n of incoming) {
    const clean = n.trim();
    if (clean && !merged.some((m) => m.toLowerCase() === clean.toLowerCase())) merged.push(clean);
  }
  return merged.slice(-MAX_NOTES);
}

export const useTravelerMemory = create<TravelerMemoryState>()(
  persist(
    (set, get) => ({
      notes: [],
      learn: (text) => {
        const found = extractPreferences(text || "");
        if (!found.length) return;
        set({ notes: mergeNotes(get().notes, found) });
      },
      remember: (note) => set({ notes: mergeNotes(get().notes, [note]) }),
      clear: () => set({ notes: [] }),
    }),
    { name: "whatahotel-memory" },
  ),
);
