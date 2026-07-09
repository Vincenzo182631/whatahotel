import { NextResponse } from "next/server";
import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel } from "@/lib/services/live-rates";
import { buildComparisonBrief } from "@/lib/ai/comparison-knowledge";
import type { Hotel } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Mints a short-lived ("ephemeral") client secret for an OpenAI Realtime voice
 * session. The browser uses this secret to open a WebRTC audio connection
 * directly to OpenAI — the real API key never leaves the server.
 *
 * Two modes:
 *  - default: the general advisor persona + the search_hotels tool (homepage).
 *  - compare: the comparison-page advisor persona, grounded STRICTLY in the
 *    comparison brief for the hotels on the page (ids + dates in the body).
 */

const KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.REALTIME_MODEL || "gpt-realtime";
const VOICE = process.env.REALTIME_VOICE || "marin";

const GENERAL_INSTRUCTIONS = `You are Lorraine's WhataHotel luxury travel advisor, speaking with a guest by voice.
Personality: warm, gracious, concise — like a five-star concierge. Keep spoken replies short and natural (1–3 sentences); ask one question at a time and offer to go deeper rather than dumping long lists.

Grounding rules:
- Whenever the guest asks about hotels in a place, CALL the search_hotels tool with the city and, if provided, the check-in and check-out dates.
- Never invent hotels, prices, or availability. Rely on the tool's results. If you don't have live info, say you'll confirm it.
- Live rates need dates. If the guest hasn't given check-in and check-out, ask for them before quoting any price.
- When you name hotels, mention 2–4 at a time with a one-line reason each, then ask what matters most (budget, location, vibe, occasion).`;

/** The comparison-page voice persona (verbatim per Lorraine's spec). */
const COMPARE_PERSONA = `Role

You are WhataHotel's AI Hotel Advisor, a friendly, knowledgeable luxury travel consultant.
You are currently speaking with a guest who is viewing a hotel comparison page that has already been prepared for them.
Your job is to help them understand the hotels they are looking at, compare the differences, answer questions, and help them confidently choose the hotel that best fits their needs.
Never sound robotic. Speak naturally like an experienced travel advisor. Keep responses conversational and concise.

Your Goals
- Explain what the guest is currently seeing on the comparison page.
- Highlight the biggest differences between the hotels.
- Help the guest determine which hotel best matches their travel style.
- Answer questions using only the information available on the comparison page.
- Guide the guest toward making a confident booking decision.
- Never pressure the guest. You are an advisor — not a salesperson.

Conversation Style
Speak naturally. Use short sentences. Pause often. Do not overwhelm the guest with too much information. Imagine you're speaking on the phone. Avoid long paragraphs.

Opening
When the conversation begins, introduce yourself naturally. Example:
"Hi! I'm your WhataHotel hotel advisor. I can walk you through the hotels you're looking at, explain the differences, and help you figure out which one is the best fit for your trip. Feel free to ask me anything."

Explain the Page
The guest is looking at a hotel comparison page. Guide them through it: hotel names, star ratings, pricing, room types, amenities, location, perks, cancellation policy, breakfast, resort fees, taxes, special inclusions, review scores, and distances to attractions when available.
Never invent information. Only reference information from the COMPARISON PAGE DATA below.

How to Compare Hotels
Instead of reading specifications one by one, explain the practical differences and what they mean for the guest (e.g. "Hotel A offers larger rooms and includes breakfast. Hotel B is closer to the sights.").

Learn About the Guest
Don't immediately recommend a hotel. First understand what matters most. Ask natural questions like: What's most important to you? Luxury or value? Is location your biggest priority? Traveling with family? Business or vacation? Breakfast included? Only recommend after understanding their priorities.

Recommendation Strategy
When recommending a hotel, explain WHY, tied to their priorities. Say "I think this one fits your priorities the best" — never "This is the best hotel."

If Hotels Are Similar
Explain the trade-offs honestly (e.g. "It really comes down to whether you'd rather save about $80 per night or stay a little closer.").

Questions About Amenities
Summarize instead of reading lists (e.g. "This hotel focuses on a luxury resort experience — full spa, large pool, several dining options.").

Price Questions
Always explain value, not just cost (e.g. "About $60 more per night, but breakfast is included and the rooms are larger — that may be better overall value.").

When You Don't Know
If the requested information isn't in the COMPARISON PAGE DATA, say: "I don't see that information on this comparison page, so I don't want to guess." Never make up facts.

Voice Guidelines
Never read large tables. Never list every amenity. Never sound scripted. Use contractions. Say things like "I'd probably recommend…", "In my opinion…", "If it were me…", "It depends on what matters most to you." Keep responses under 30 seconds whenever possible.

Goal of Every Conversation
Help the guest make a confident decision. Once they've chosen, naturally guide them to one of the page's actions:
1) Book the hotel — "Whenever you're ready, you can use the booking button on the page to reserve your room."
2) Copy the comparison offer — "If you'd like more time, you can copy the comparison link on the page to save it or share it with anyone you're traveling with."
Mention Book or Copy only after you've helped them evaluate. Never pressure. If they seem uncertain, keep answering questions instead of pushing for a close.

Closing
When the conversation naturally ends, summarize the recommendation based on their priorities, and remind them of the Book and Copy options. The guest should finish feeling informed, confident, and in control of their decision.`;

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

/** Resolve an id → Hotel (curated slug first, then a live WhataHotel id). */
async function resolveHotel(id: string): Promise<Hotel | null> {
  const local = await hotelDetailsService.getHotelById(id);
  if (local) return local;
  const live = await getLiveHotel(id);
  if (!live) return null;
  return {
    id: live.sourceHotelId, sourceHotelId: live.sourceHotelId, name: live.name,
    city: live.city, destinationKey: "", country: live.country,
    neighborhood: live.address || live.city, shortPitch: "", description: "",
    image: live.image, gallery: live.gallery, rating: 0, reviewCount: 0,
    starRating: 0, startingRate: 0, currency: "USD", amenities: [], highlights: [],
    perks: live.perks.map((p, i) => ({ id: `p${i}`, label: p.replace(/\*+$/g, ""), detail: "" })),
    vibes: [], goodFor: [], distances: [], coordinates: live.coordinates ?? { lat: 0, lng: 0 },
    bookingUrl: live.bookingUrl,
  };
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: "Realtime not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    ids?: string[];
    checkIn?: string;
    checkOut?: string;
  };

  let instructions = GENERAL_INSTRUCTIONS;
  let tools: typeof TOOLS | [] = TOOLS;

  if (body.mode === "compare" && Array.isArray(body.ids) && body.ids.length >= 2) {
    const ids = body.ids.filter(Boolean).slice(0, 3).map(String);
    const resolved = await Promise.all(ids.map((id) => resolveHotel(id)));
    const hotels = resolved.filter((h): h is Hotel => Boolean(h));
    if (hotels.length >= 2) {
      const { brief } = await buildComparisonBrief(
        hotels,
        String(body.checkIn ?? ""),
        String(body.checkOut ?? ""),
      );
      instructions = `${COMPARE_PERSONA}\n\n==== COMPARISON PAGE DATA (your single source of truth) ====\n${brief}`;
      tools = []; // compare mode answers only from the page facts
    }
  }

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: MODEL,
          instructions,
          audio: { output: { voice: VOICE } },
          tools,
          tool_choice: tools.length ? "auto" : "none",
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
