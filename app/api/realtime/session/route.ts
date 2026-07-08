import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived ("ephemeral") client secret for an OpenAI Realtime voice
 * session. The browser uses this secret to open a WebRTC audio connection
 * directly to OpenAI — the real API key never leaves the server. The advisor's
 * persona + the live hotel-search tool are configured here so every session is
 * grounded and on-brand.
 */

const KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.REALTIME_MODEL || "gpt-realtime";
const VOICE = process.env.REALTIME_VOICE || "marin";

const INSTRUCTIONS = `You are Lorraine's WhataHotel luxury travel advisor, speaking with a guest by voice.
Personality: warm, gracious, concise — like a five-star concierge. Keep spoken replies short and natural (1–3 sentences); ask one question at a time and offer to go deeper rather than dumping long lists.

Grounding rules:
- Whenever the guest asks about hotels in a place, CALL the search_hotels tool with the city and, if provided, the check-in and check-out dates.
- Never invent hotels, prices, or availability. Rely on the tool's results. If you don't have live info, say you'll confirm it.
- Live rates need dates. If the guest hasn't given check-in and check-out, ask for them before quoting any price.
- When you name hotels, mention 2–4 at a time with a one-line reason each, then ask what matters most (budget, location, vibe, occasion).`;

const TOOLS = [
  {
    type: "function",
    name: "search_hotels",
    description:
      "Find live hotels in a city, optionally for specific dates. Returns hotel names, city/country, and an approximate nightly rate when dates are given. Use for any 'hotels in <place>' request.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City or destination, e.g. 'Paris' or 'Bali'." },
        checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD (optional)." },
        checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD (optional)." },
      },
      required: ["city"],
    },
  },
];

export async function POST() {
  if (!KEY) return NextResponse.json({ error: "Realtime not configured" }, { status: 503 });
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: MODEL,
          instructions: INSTRUCTIONS,
          audio: { output: { voice: VOICE } },
          tools: TOOLS,
          tool_choice: "auto",
        },
      }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.value) {
      console.error("Realtime session failed:", r.status, JSON.stringify(j)?.slice(0, 300));
      return NextResponse.json({ error: "Couldn't start a voice session." }, { status: 502 });
    }
    return NextResponse.json({ value: j.value, expires_at: j.expires_at, model: MODEL });
  } catch (e) {
    console.error("Realtime session error:", (e as Error)?.message);
    return NextResponse.json({ error: "Voice session error" }, { status: 500 });
  }
}
