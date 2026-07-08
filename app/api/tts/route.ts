import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Natural text-to-speech for the advisor's spoken replies. Two engines:
 *  - "openai"     → OpenAI audio API (uses OPENAI_API_KEY). Live by default.
 *  - "elevenlabs" → ElevenLabs (uses ELEVENLABS_API_KEY, requires a paid plan).
 * The browser sends cleaned text + provider + voice; we return MP3 audio the
 * client plays. Keys stay server-side. Not configured / error → 5xx, and the
 * client silently falls back to the free browser voice.
 */

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

// OpenAI voices offered in the picker (kept in sync with lib/voice/voices.ts).
const OPENAI_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer",
]);

/** Report which engines are configured, so the picker can show availability. */
export async function GET() {
  return NextResponse.json({
    providers: { openai: Boolean(OPENAI_KEY), elevenlabs: Boolean(ELEVEN_KEY) },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    voice?: string;
    provider?: string;
  };
  const text = (body.text || "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ error: "No text" }, { status: 400 });
  const provider = body.provider === "elevenlabs" ? "elevenlabs" : "openai";

  try {
    const res =
      provider === "elevenlabs"
        ? await synthElevenLabs(text, body.voice)
        : await synthOpenAI(text, body.voice);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`${provider} TTS failed:`, res.status, detail.slice(0, 300));
      // 402 (paid plan) / 401 (key) surface as 502 so the client falls back.
      return NextResponse.json({ error: `${provider} TTS error` }, { status: 502 });
    }
    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("TTS route error:", (e as Error)?.message);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}

async function synthOpenAI(text: string, voiceIn?: string): Promise<Response> {
  if (!OPENAI_KEY) return new Response("OpenAI TTS not configured", { status: 503 });
  const voice = OPENAI_VOICES.has(voiceIn || "") ? voiceIn! : "nova";
  return fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENAI_MODEL, voice, input: text, response_format: "mp3" }),
  });
}

async function synthElevenLabs(text: string, voiceIn?: string): Promise<Response> {
  if (!ELEVEN_KEY) return new Response("ElevenLabs not configured", { status: 503 });
  // Fall back to Charlotte if no/blank voice id is sent.
  const voiceId = (voiceIn || "XB0fDUnXU5powFXDhCwa").trim();
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: ELEVEN_MODEL,
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    }),
  });
}
