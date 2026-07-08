"use client";

import { useVoiceStore, type VoiceProvider } from "@/store/voice-store";
import { speak, cancelSpeech, stripForSpeech, ttsSupported } from "./speech";

/**
 * One place that turns advisor text into audio, honouring the guest's chosen
 * engine + voice. OpenAI path fetches natural MP3 from /api/tts and plays it;
 * the browser path uses the free built-in voice. Any OpenAI failure silently
 * falls back to the browser voice so speech never just dies.
 */

let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let playToken = 0; // invalidates in-flight fetches when a newer request starts

function getAudio(): HTMLAudioElement {
  if (!audioEl) audioEl = new Audio();
  return audioEl;
}

function releaseUrl() {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

/** Stop any speech immediately (both engines). */
export function stopSpeaking(): void {
  playToken++;
  cancelSpeech();
  if (audioEl) {
    audioEl.pause();
    audioEl.src = "";
  }
  releaseUrl();
}

async function playRemote(
  provider: "openai" | "elevenlabs",
  text: string,
  voice: string,
  onEnd?: () => void,
  onStart?: () => void,
): Promise<boolean> {
  const token = ++playToken;
  const clean = stripForSpeech(text);
  if (!clean) return true;
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, voice, provider }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (token !== playToken) return true; // superseded by a newer request
    releaseUrl();
    currentUrl = URL.createObjectURL(blob);
    const a = getAudio();
    a.src = currentUrl;
    a.onended = () => onEnd?.();
    a.onerror = () => onEnd?.();
    onStart?.();
    await a.play();
    return true;
  } catch {
    return false;
  }
}

interface SpeakOpts {
  provider?: VoiceProvider;
  voice?: string; // openai / elevenlabs voice id
  voiceURI?: string; // browser voice uri
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speak text with the current (or overridden) voice settings. Returns once
 * playback has *started* (or finished, for the browser voice).
 */
export async function speakText(text: string, opts: SpeakOpts = {}): Promise<void> {
  const st = useVoiceStore.getState();
  const provider = opts.provider ?? st.provider;
  stopSpeaking();

  if (provider === "openai" || provider === "elevenlabs") {
    const voice = opts.voice ?? (provider === "elevenlabs" ? st.elevenVoice : st.openaiVoice);
    const ok = await playRemote(provider, text, voice, opts.onEnd, opts.onStart);
    if (ok) return;
    // fall through to the free browser voice on any remote failure
  }

  if (ttsSupported()) {
    speak(text, {
      voiceURI: opts.voiceURI ?? (st.browserVoiceURI || undefined),
      onStart: opts.onStart,
      onEnd: opts.onEnd,
    });
  } else {
    opts.onEnd?.();
  }
}
