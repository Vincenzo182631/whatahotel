"use client";

/**
 * Browser-native voice helpers for the advisor chat — zero keys, zero cost.
 *
 * - Speech-to-text uses the Web Speech API (SpeechRecognition), so the guest can
 *   dictate instead of type. Best in Chrome/Edge/Safari.
 * - Text-to-speech uses SpeechSynthesis so the advisor can read its reply aloud.
 *
 * Everything degrades gracefully: if the browser doesn't support a piece, the
 * corresponding control simply hides (see `dictationSupported` / `ttsSupported`).
 */

// ----- capability checks (safe on the server: guarded by typeof window) -----

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

export function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function dictationSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// ----- clean advisor markdown into natural speech -----

/**
 * Strip markdown, custom advisor tags ([img:…], [book:…], [findhotel:…],
 * [hotel]) and noise so TTS reads clean, natural prose — not asterisks and URLs.
 */
export function stripForSpeech(input: string): string {
  let t = input || "";
  t = t.replace(/```[\s\S]*?```/g, " "); // code blocks
  t = t.replace(/\[(?:img|book|findhotel):[^\]]*\]/gi, " "); // advisor asset tags
  t = t.replace(/\[hotel\]/gi, " "); // inline hotel card token
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " "); // markdown images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); // links → keep the label
  t = t.replace(/https?:\/\/\S+/g, " "); // bare URLs
  t = t.replace(/[*_`#>~]/g, ""); // markdown emphasis/heading marks
  t = t.replace(/^\s*[-•]\s*/gm, ""); // list bullets
  t = t.replace(/\|/g, " "); // table pipes
  // Drop emoji / pictographs so they aren't read as "grinning face".
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "");
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{2,}/g, ". ").replace(/\s+\./g, ".");
  return t.trim();
}

// ----- text-to-speech controller (singleton) -----

let cachedVoice: SpeechSynthesisVoice | null = null;

/** All available browser voices (English first), for the picker. */
export function listBrowserVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const rest = voices.filter((v) => !/^en(-|_|$)/i.test(v.lang));
  return [...en, ...rest];
}

/** Pick the nicest available English voice once, then reuse it. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : voices;
  // Prefer known natural-sounding voices, else the first local English voice.
  const preferred = [
    "Google UK English Female",
    "Google US English",
    "Samantha",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Microsoft Zira - English (United States)",
  ];
  cachedVoice =
    pool.find((v) => preferred.includes(v.name)) ||
    pool.find((v) => /female|aria|jenny|samantha|zira/i.test(v.name)) ||
    pool.find((v) => v.localService) ||
    pool[0];
  return cachedVoice;
}

// Voices load asynchronously in some browsers — warm the cache when they arrive.
if (typeof window !== "undefined" && ttsSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

/** Speak `text` aloud with the free browser voice, cancelling anything already speaking. */
export function speak(
  text: string,
  handlers?: { onStart?: () => void; onEnd?: () => void; voiceURI?: string },
): SpeechSynthesisUtterance | null {
  if (!ttsSupported()) return null;
  const clean = stripForSpeech(text);
  if (!clean) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean.slice(0, 4000)); // guard runaway length
  const chosen = handlers?.voiceURI
    ? listBrowserVoices().find((v) => v.voiceURI === handlers.voiceURI)
    : null;
  const voice = chosen || pickVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  }
  u.rate = 1;
  u.pitch = 1;
  if (handlers?.onStart) u.onstart = handlers.onStart;
  if (handlers?.onEnd) {
    u.onend = handlers.onEnd;
    u.onerror = handlers.onEnd;
  }
  window.speechSynthesis.speak(u);
  return u;
}

/** Stop any in-progress speech immediately. */
export function cancelSpeech(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
