import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Natural text-to-speech for the advisor's spoken replies, via OpenAI's audio
 * API. The browser sends cleaned text + a chosen voice; we return MP3 audio the
 * client plays. Keeps the OpenAI key server-side. No key configured (or an
 * error) → 503, and the client falls back to the free browser voice.
 */

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const TTS_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";

// Voices offered in the picker. Kept in sync with lib/voice/voices.ts.
const VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer",
]);

export async function POST(req: Request) {
  if (!OPENAI_KEY) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string };
  const text = (body.text || "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ error: "No text" }, { status: 400 });
  const voice = VOICES.has(body.voice || "") ? body.voice! : "nova";

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice,
        input: text,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenAI TTS failed:", res.status, detail.slice(0, 300));
      return NextResponse.json({ error: "TTS upstream error" }, { status: 502 });
    }
    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        // Same text+voice is deterministic enough to cache briefly.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("TTS route error:", (e as Error)?.message);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}
