"use client";

import { create } from "zustand";

export interface CompareItem {
  id: string;
  name: string;
}

interface CompareSelectionState {
  selected: CompareItem[];
  /** A transient friendly message (e.g. the 3-hotel limit). */
  notice: string | null;
  isSelected: (id: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const MAX_COMPARE = 3;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

export const useCompareSelection = create<CompareSelectionState>((set, get) => ({
  selected: [],
  notice: null,
  isSelected: (id) => get().selected.some((s) => s.id === id),
  toggle: (item) => {
    const { selected } = get();
    if (selected.some((s) => s.id === item.id)) {
      set({ selected: selected.filter((s) => s.id !== item.id), notice: null });
      return;
    }
    if (selected.length >= MAX_COMPARE) {
      set({ notice: `You can compare up to ${MAX_COMPARE} hotels at a time — deselect one first.` });
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => set({ notice: null }), 3500);
      return;
    }
    set({ selected: [...selected, item], notice: null });
  },
  remove: (id) => set((s) => ({ selected: s.selected.filter((x) => x.id !== id) })),
  clear: () => set({ selected: [], notice: null }),
}));
