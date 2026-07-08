"use client";

import { useEffect, useRef } from "react";
import { useVoiceStore } from "@/store/voice-store";
import { speak, cancelSpeech, ttsSupported } from "./speech";

interface SpeakableMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

/**
 * When "speak replies" is on, read each advisor message aloud once — the moment
 * it finishes streaming. Tracks which messages have already been spoken so a
 * re-render never repeats one, and never speaks a half-streamed message.
 *
 * Call once near the top of any advisor component, passing its message list.
 */
export function useSpeakReplies(messages: SpeakableMsg[]): void {
  const speakReplies = useVoiceStore((s) => s.speakReplies);
  const spoken = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  // On first mount, mark existing settled replies as already "spoken" so we
  // don't suddenly read the whole restored/backlog conversation out loud.
  useEffect(() => {
    if (primed.current) return;
    primed.current = true;
    for (const m of messages) {
      if (m.role === "assistant" && !m.streaming) spoken.current.add(m.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!speakReplies || !ttsSupported()) return;
    for (const m of messages) {
      if (m.role !== "assistant" || m.streaming) continue;
      if (spoken.current.has(m.id)) continue;
      spoken.current.add(m.id);
      if (m.content.trim()) speak(m.content);
    }
  }, [messages, speakReplies]);

  // Stop talking if the user turns the feature off, or the view unmounts.
  useEffect(() => {
    if (!speakReplies) cancelSpeech();
  }, [speakReplies]);
  useEffect(() => () => cancelSpeech(), []);
}
