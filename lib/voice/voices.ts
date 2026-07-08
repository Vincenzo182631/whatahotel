/**
 * The natural OpenAI voices offered in the advisor's voice picker. Descriptions
 * are short so the picker reads at a glance. Keep the ids in sync with the
 * allow-list in app/api/tts/route.ts.
 */
export interface OpenAiVoice {
  id: string;
  label: string;
  blurb: string;
}

export const OPENAI_VOICES: OpenAiVoice[] = [
  { id: "nova", label: "Nova", blurb: "Warm, friendly (default)" },
  { id: "shimmer", label: "Shimmer", blurb: "Bright, upbeat" },
  { id: "coral", label: "Coral", blurb: "Poised, gracious" },
  { id: "sage", label: "Sage", blurb: "Calm, reassuring" },
  { id: "alloy", label: "Alloy", blurb: "Neutral, balanced" },
  { id: "fable", label: "Fable", blurb: "Expressive, storyteller" },
  { id: "ballad", label: "Ballad", blurb: "Soft, elegant" },
  { id: "ash", label: "Ash", blurb: "Confident, clear" },
  { id: "echo", label: "Echo", blurb: "Smooth, measured" },
  { id: "onyx", label: "Onyx", blurb: "Deep, authoritative" },
];

export const DEFAULT_OPENAI_VOICE = "nova";

/**
 * ElevenLabs premium voices (their built-in "premade" library — available on
 * any paid ElevenLabs plan). ids are ElevenLabs voice_ids. Curated for a luxury
 * travel advisor; add your own cloned voice here later by dropping in its id.
 */
export interface ElevenVoice {
  id: string;
  label: string;
  blurb: string;
}

export const ELEVEN_VOICES: ElevenVoice[] = [
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte", blurb: "Elegant, warm (default)" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice", blurb: "Clear, professional (British)" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily", blurb: "Warm, gentle (British)" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda", blurb: "Friendly, approachable" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel", blurb: "Calm, refined narration" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", blurb: "Soft, poised" },
  { id: "JBFqnCBsd6RMkjVDRzzb", label: "George", blurb: "Warm, gracious (British male)" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", blurb: "Authoritative (British male)" },
];

export const DEFAULT_ELEVEN_VOICE = "XB0fDUnXU5powFXDhCwa"; // Charlotte

/** A short line used to preview a voice in the picker. */
export const VOICE_SAMPLE =
  "Hi, I'm your WhataHotel travel advisor. I can help you compare hotels and plan the perfect stay.";
