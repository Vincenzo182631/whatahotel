"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_OPENAI_VOICE, DEFAULT_ELEVEN_VOICE } from "@/lib/voice/voices";

/**
 * Voice preferences for the advisor: whether it reads replies aloud, which
 * engine to use, and which voice. Persisted across the app and reloads.
 *
 * - provider "openai":     natural neural voices via /api/tts (uses the OpenAI key).
 * - provider "elevenlabs": premium voices via /api/tts (uses the ElevenLabs key).
 * - provider "browser":    the free, built-in Web Speech voice (no cost/network).
 */
export type VoiceProvider = "openai" | "elevenlabs" | "browser";

interface VoiceState {
  speakReplies: boolean;
  provider: VoiceProvider;
  openaiVoice: string;
  elevenVoice: string;
  browserVoiceURI: string; // "" = auto-pick the best available system voice
  setSpeakReplies: (v: boolean) => void;
  toggleSpeak: () => void;
  setProvider: (p: VoiceProvider) => void;
  setOpenaiVoice: (v: string) => void;
  setElevenVoice: (v: string) => void;
  setBrowserVoiceURI: (uri: string) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      speakReplies: false,
      provider: "openai",
      openaiVoice: DEFAULT_OPENAI_VOICE,
      elevenVoice: DEFAULT_ELEVEN_VOICE,
      browserVoiceURI: "",
      setSpeakReplies: (v) => set({ speakReplies: v }),
      toggleSpeak: () => set((s) => ({ speakReplies: !s.speakReplies })),
      setProvider: (provider) => set({ provider }),
      setOpenaiVoice: (openaiVoice) => set({ openaiVoice }),
      setElevenVoice: (elevenVoice) => set({ elevenVoice }),
      setBrowserVoiceURI: (browserVoiceURI) => set({ browserVoiceURI }),
    }),
    { name: "whatahotel-voice" },
  ),
);
