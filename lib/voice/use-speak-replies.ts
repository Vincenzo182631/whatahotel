"use client";

import { useEffect, useRef } from "react";
import { useVoiceStore } from "@/store/voice-store";
import { enqueueSpeech, stopSpeaking } from "./tts";
import { VOICE_FEATURES } from "@/lib/flags";

interface SpeakableMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

/**
 * Given raw reply text and how much has already been spoken, return the next
 * speakable chunk. While still streaming we only hand over COMPLETE sentences (up
 * to the last sentence boundary), buffering the tail until more arrives; once the
 * reply has finished we flush whatever remains.
 */
function nextChunk(full: string, offset: number, ended: boolean): { text: string; offset: number } | null {
  const rest = full.slice(offset);
  if (!rest.trim()) return ended ? null : null;
  if (ended) return { text: rest, offset: full.length };
  // Speak up to the last completed sentence (terminator + space) or paragraph.
  let boundary = -1;
  for (const t of [". ", "! ", "? ", "… ", ".\n", "!\n", "?\n", "\n\n"]) {
    boundary = Math.max(boundary, rest.lastIndexOf(t) + (rest.lastIndexOf(t) < 0 ? 0 : 1));
  }
  if (boundary <= 0) return null; // no complete sentence yet
  return { text: rest.slice(0, boundary), offset: offset + boundary };
}

/**
 * When "speak replies" is on, read each advisor message aloud — streaming it
 * sentence-by-sentence as it's generated, so the voice starts almost immediately
 * instead of waiting for the whole answer. Tracks a per-message spoken offset so
 * nothing is repeated or half-spoken.
 *
 * Call once near the top of any advisor component, passing its message list.
 */
export function useSpeakReplies(messages: SpeakableMsg[]): void {
  const speakReplies = useVoiceStore((s) => s.speakReplies);
  const offsets = useRef<Map<string, number>>(new Map());
  const primed = useRef(false);

  // On first mount, mark existing settled replies as fully spoken so we don't
  // suddenly read a restored/backlog conversation out loud.
  useEffect(() => {
    if (primed.current) return;
    primed.current = true;
    for (const m of messages) {
      if (m.role === "assistant" && !m.streaming) offsets.current.set(m.id, m.content.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!VOICE_FEATURES || !speakReplies) return;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      const off = offsets.current.get(m.id) ?? 0;
      const next = nextChunk(m.content, off, !m.streaming);
      if (next && next.text.trim()) {
        offsets.current.set(m.id, next.offset);
        enqueueSpeech(next.text);
      } else if (!m.streaming && !offsets.current.has(m.id)) {
        offsets.current.set(m.id, m.content.length);
      }
    }
  }, [messages, speakReplies]);

  // Stop talking if the user turns the feature off, or the view unmounts.
  useEffect(() => {
    if (!speakReplies) stopSpeaking();
  }, [speakReplies]);
  useEffect(() => () => stopSpeaking(), []);
}
