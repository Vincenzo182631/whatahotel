"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Whether the advisor should read its replies aloud (text-to-speech). Off by
 * default; the guest flips it from the speaker button in the chat composer, and
 * the preference is remembered across the app and reloads.
 */
interface VoiceState {
  speakReplies: boolean;
  setSpeakReplies: (v: boolean) => void;
  toggleSpeak: () => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      speakReplies: false,
      setSpeakReplies: (v) => set({ speakReplies: v }),
      toggleSpeak: () => set((s) => ({ speakReplies: !s.speakReplies })),
    }),
    { name: "whatahotel-voice" },
  ),
);
