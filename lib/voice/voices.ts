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

/** A short line used to preview a voice in the picker. */
export const VOICE_SAMPLE =
  "Hi, I'm your WhataHotel travel advisor. I can help you compare hotels and plan the perfect stay.";
