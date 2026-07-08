"use client";

import { useVoiceStore, type VoiceProvider } from "@/store/voice-store";
import { speak, cancelSpeech, stripForSpeech, ttsSupported } from "./speech";

/**
 * Streaming text-to-speech. The advisor's reply is fed in sentence-by-sentence
 * as it's generated, and each sentence is spoken the moment it's ready — so the
 * voice starts within ~a second instead of waiting for the whole answer. Chunks
 * play in order; the next chunk's audio is prefetched while the current one
 * plays so it flows without gaps.
 *
 * OpenAI/ElevenLabs fetch natural MP3 from /api/tts; any failure falls back to
 * the free browser voice for that chunk so speech never dies.
 */

let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let token = 0; // bumps on stop → invalidates in-flight fetches + playback
let queue: string[] = [];
let runnerActive = false;

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

/** Stop everything immediately and clear the queue. */
export function stopSpeaking(): void {
  token++;
  queue = [];
  cancelSpeech();
  if (audioEl) {
    audioEl.pause();
    audioEl.onended = null;
    audioEl.onerror = null;
    audioEl.src = "";
  }
  releaseUrl();
}

async function fetchTts(clean: string, provider: string, voice?: string): Promise<Blob | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, voice, provider }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function playBlob(blob: Blob, my: number): Promise<void> {
  return new Promise((resolve) => {
    if (my !== token) return resolve();
    releaseUrl();
    currentUrl = URL.createObjectURL(blob);
    const a = getAudio();
    a.src = currentUrl;
    a.onended = () => resolve();
    a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
}

function playBrowser(clean: string, voiceURI: string | undefined, my: number): Promise<void> {
  return new Promise((resolve) => {
    if (my !== token || !ttsSupported()) return resolve();
    speak(clean, { voiceURI, onEnd: resolve });
  });
}

async function runQueue(): Promise<void> {
  if (runnerActive) return;
  runnerActive = true;
  const my = token;
  const s = useVoiceStore.getState();
  const provider = s.provider;
  const remote = provider === "openai" || provider === "elevenlabs";
  const voice = provider === "elevenlabs" ? s.elevenVoice : s.openaiVoice;
  const voiceURI = s.browserVoiceURI || undefined;
  let pending: Promise<Blob | null> | null = null;
  try {
    while (queue.length && my === token) {
      const clean = queue.shift()!;
      if (remote) {
        const blobP = pending ?? fetchTts(clean, provider, voice);
        pending = queue.length ? fetchTts(queue[0], provider, voice) : null; // prefetch next
        const blob = await blobP;
        if (my !== token) break;
        if (blob) await playBlob(blob, my);
        else await playBrowser(clean, voiceURI, my); // per-chunk fallback
      } else {
        await playBrowser(clean, voiceURI, my);
      }
    }
  } finally {
    runnerActive = false;
    // A stop (or a same-reply enqueue that arrived mid-await) may have left work.
    if (queue.length) void runQueue();
  }
}

/** Queue a chunk of reply text to be spoken after anything already queued. */
export function enqueueSpeech(text: string): void {
  const clean = stripForSpeech(text);
  if (!clean) return;
  queue.push(clean);
  void runQueue();
}

interface SpeakOpts {
  provider?: VoiceProvider;
  voice?: string;
  voiceURI?: string;
  onEnd?: () => void;
}

/** One-shot speak (stops anything first). Used for voice previews with overrides. */
export async function speakText(text: string, opts: SpeakOpts = {}): Promise<void> {
  stopSpeaking();
  const clean = stripForSpeech(text);
  if (!clean) {
    opts.onEnd?.();
    return;
  }
  const s = useVoiceStore.getState();
  const provider = opts.provider ?? s.provider;
  const my = token;
  if (provider === "openai" || provider === "elevenlabs") {
    const voice = opts.voice ?? (provider === "elevenlabs" ? s.elevenVoice : s.openaiVoice);
    const blob = await fetchTts(clean, provider, voice);
    if (my !== token) return;
    if (blob) {
      await playBlob(blob, my);
      opts.onEnd?.();
      return;
    }
  }
  await playBrowser(clean, opts.voiceURI ?? (s.browserVoiceURI || undefined), my);
  opts.onEnd?.();
}
