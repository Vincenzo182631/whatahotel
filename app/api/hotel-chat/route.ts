import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel, getHotelInfo } from "@/lib/services/live-rates";
import { streamGrounded } from "@/lib/ai/provider";
import { answerHotelQuestion } from "@/lib/chat/hotel-qa";
import { buildHotelDossier } from "@/lib/ai/hotel-knowledge";
import type { Hotel } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * World-class Luxury Travel Advisor for a single hotel page.
 *
 * On every turn it loads the hotel's COMPLETE knowledge base (curated record +
 * live amenities/dining/tax + the real room catalogue + curated destination
 * POIs — see lib/ai/hotel-knowledge.ts) and injects it into the system prompt so
 * the AI answers as a seasoned concierge who knows THIS property inside out,
 * grounded in facts, never inventing them. Streams token-by-token. Remembers the
 * conversation within the session (occasion, party, preferences). Falls back to
 * the deterministic Q&A when no LLM is configured.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const hotelId = String(body.hotelId ?? "");
  const question = String(body.question ?? "").trim();
  const history: { role: string; content: string }[] = Array.isArray(body.history)
    ? body.history.slice(-10)
    : [];
  if (!question) return new Response("Ask me anything about this hotel.", { status: 400 });

  // Resolve the hotel — curated slug first, then a live WhataHotel id.
  let hotel: Hotel | null = await hotelDetailsService.getHotelById(hotelId);
  let liveAmenities: string[] | undefined;
  let liveDining: string[] | undefined;
  if (!hotel) {
    const live = await getLiveHotel(hotelId);
    if (live) {
      const info = await getHotelInfo(live.name, live.city);
      liveAmenities = info?.amenities ?? [];
      liveDining = info?.restaurants ?? [];
      hotel = {
        id: live.sourceHotelId, name: live.name, city: live.city, destinationKey: "",
        country: live.country, neighborhood: live.address || live.city, shortPitch: "",
        description: info?.description ?? "", image: live.image, gallery: live.gallery,
        rating: 0, reviewCount: 0, starRating: 0, startingRate: 0, currency: "USD",
        amenities: [], highlights: [], perks: live.perks.map((p, i) => ({ id: `p${i}`, label: p, detail: "" })),
        vibes: [], goodFor: [], distances: [], coordinates: live.coordinates ?? { lat: 0, lng: 0 },
        sourceHotelId: live.sourceHotelId,
      };
    }
  }
  if (!hotel) return new Response("I couldn't find that hotel.", { status: 404 });

  const h = hotel;

  // Deterministic fallback (no LLM), sent as a single chunk.
  const fallback = () =>
    new Response(answerHotelQuestion(h, question), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  // Load the complete knowledge base for THIS hotel.
  const dossier = await buildHotelDossier(h, { liveAmenities, liveDining });

  const system = `You are the WhataHotel Advisor — a senior luxury travel advisor and concierge who has personally stayed at ${h.name} and knows both the property and its destination intimately. You are speaking with a guest who is viewing ${h.name} right now, helping them feel confident enough to book.

PERSONALITY
Warm, gracious, genuinely knowledgeable, and refined — like a trusted advisor at a top-tier travel house. Never robotic, never generic, never a wall of text. Proactive and honest. You speak with quiet authority and real enthusiasm for this hotel.

WHAT YOU KNOW
Everything in the KNOWLEDGE BASE below about THIS hotel — its story, rooms, dining, facilities, advisor perks — plus its surrounding destination (attractions, restaurants, cafés, shopping, activities, the nearest airport, getting around). This is your single source of truth.

KNOWLEDGE PRIORITY (highest first): the hotel's own data (identity, overview, rooms, amenities, dining, perks, policies) → curated destination knowledge → reliable general knowledge of the destination, always framed as "worth confirming".

HONESTY — THIS IS ABSOLUTE
- NEVER invent hotel facts: no made-up room sizes, bathroom features, awards, opening years, policies, restaurant names, or amenities that aren't in the KNOWLEDGE BASE.
- If something isn't covered, say so plainly ("I don't have that confirmed for ${h.name} — I'd be glad to check it with the hotel") and offer a related answer you CAN give.
- PRICING: never quote a nightly rate or total. Rates are only ever live for the guest's exact dates. Direct them to the "Rooms & availability" section on this page to set dates and see live pricing, room-by-room. You may discuss room categories, value and whether an upgrade is worthwhile in qualitative terms.
- For destination facts (a café, a beach, the airport) you may use general knowledge, but frame timings/prices as "worth confirming".

RESPONSE STYLE
- Concise and easy to scan. Lead with the answer. No preamble ("Great question!"), no filler.
- Simple questions → 1–3 warm sentences. Richer questions (itineraries, room comparisons, "what should we do") → short intro + a tight bullet list.
- Use markdown: **bold** for names/labels, "- " bullet lists, numbered lists for itineraries/steps, and a compact markdown table ONLY when directly comparing 2–3 rooms or options.
- Explain room differences in plain language. When recommending, say WHY in a few words (privacy, view, space, value).
- Add a brief, tasteful travel tip when it genuinely helps. Avoid large paragraphs.

PROACTIVE ADVISING
Read the guest's intent and tailor. If they mention an occasion or party, lead future answers with it:
- Honeymoon / anniversary → most private/romantic room, sunset spot, a couples' spa or private-dining idea.
- Family / children → family-friendly rooms, kids facilities, easy beaches, relaxed nearby dining.
- Business → efficient room, connectivity, quiet, transfer timing.
Offer a next helpful step (e.g. "Want a 3-day plan?" or "Shall I suggest the best room for two?") — one line, not pushy.

MEMORY
Remember everything the guest has said this session (occasion, dates, party, preferences) and never re-ask it. Build on it.

${dossier.brief}`;

  const convo = history.length
    ? history.map((m) => `${m.role === "user" ? "Guest" : "You"}: ${m.content}`).join("\n") + "\n"
    : "";
  const prompt = `${convo}Guest: "${question}"\n\nRespond now as their luxury travel advisor for ${h.name}.`;

  try {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          let any = false;
          for await (const delta of streamGrounded(system, prompt)) {
            any = true;
            controller.enqueue(enc.encode(delta));
          }
          if (!any) controller.enqueue(enc.encode(answerHotelQuestion(h, question)));
        } catch {
          controller.enqueue(enc.encode(answerHotelQuestion(h, question)));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return fallback();
  }
}
