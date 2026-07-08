import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel, getHotelInfo } from "@/lib/services/live-rates";
import { streamGrounded } from "@/lib/ai/provider";
import { answerHotelQuestion } from "@/lib/chat/hotel-qa";
import { buildHotelDossier } from "@/lib/ai/hotel-knowledge";
import { buildHotelImageManifest } from "@/lib/services/hotel-images";
import { buildBookingManifest } from "@/lib/services/hotel-booking";
import { rateLimitExceeded, tooManyText } from "@/lib/security/rate-limit";
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
  if (await rateLimitExceeded(req, "hotel-chat", 30, 60)) return tooManyText(60);

  const body = await req.json().catch(() => ({}));
  const hotelId = String(body.hotelId ?? "");
  const question = String(body.question ?? "").trim().slice(0, 2000);
  const checkIn = String(body.checkIn ?? "");
  const checkOut = String(body.checkOut ?? "");
  const memory: string[] = Array.isArray(body.memory)
    ? body.memory.map((m: unknown) => String(m)).filter(Boolean).slice(0, 24)
    : [];
  const history: { role: string; content: string }[] = Array.isArray(body.history)
    ? body.history.slice(-10)
    : [];
  if (!question) return new Response("Ask me anything about this hotel.", { status: 400 });

  // Resolve the hotel — curated slug first, then a live WhataHotel id.
  let hotel: Hotel | null = await hotelDetailsService.getHotelById(hotelId);
  let liveAmenities: string[] | undefined;
  let liveDining: string[] | undefined;
  let liveAttractions: string[] | undefined;
  let liveRoomTypes: { desc: string; features: string[] }[] | undefined;
  let livePolicies: string[] | undefined;
  if (!hotel) {
    const live = await getLiveHotel(hotelId);
    if (live) {
      const info = await getHotelInfo(live.name, live.city);
      liveAmenities = info?.amenities ?? [];
      liveDining = info?.restaurants ?? [];
      liveAttractions = info?.attractions ?? [];
      liveRoomTypes = info?.roomTypes ?? [];
      livePolicies = info?.policies ?? [];
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

  // Load the complete knowledge base + the real photo manifest for THIS hotel,
  // and (when dates are known) the prefilled booking links for those dates.
  const [dossier, images, bookings] = await Promise.all([
    buildHotelDossier(h, { liveAmenities, liveDining, liveAttractions, liveRoomTypes, livePolicies }),
    buildHotelImageManifest(h).catch(() => []),
    buildBookingManifest(h, checkIn, checkOut).catch(() => []),
  ]);

  const bookingLibrary = bookings.length
    ? `\n\n==== BOOKING LINKS (live for the guest's dates ${checkIn} → ${checkOut}) ====
When the guest wants to book or reserve a specific room, output its tag on its OWN line: [book:ID]. It renders as a bookable room CARD (photo, short details and a Reserve button) that opens the secure WhataHotel booking form, prefilled with that room, rate, their dates and perks. Use ONLY these ids; NEVER invent one or write a URL yourself. If they haven't named a room, recommend one and offer its card. Never ask for card details yourself.
${bookings.map((b) => `- [book:${b.id}] = ${b.room}`).join("\n")}
==== END BOOKING LINKS ====`
    : "";

  const roomImgs = images.filter((i) => i.kind === "room");
  const hotelImgs = images.filter((i) => i.kind === "hotel");
  const imageLibrary = images.length
    ? `\n\n==== PHOTO LIBRARY (real photos you can show) ====
ONLY show a photo when the guest EXPLICITLY asks to see one (e.g. "show me the rooms", "can I see photos", "what does it look like"). Do NOT attach images unprompted. When asked, put the tag on its OWN line: [img:ID]. Use at most 3 per reply. Use ONLY these exact ids; NEVER invent an id or a URL.
Room photos${roomImgs.length ? "" : " — none available"}:
${roomImgs.map((i) => `- [img:${i.id}] = ${i.label}`).join("\n")}
Hotel photos (general property shots — do NOT claim a specific one shows the pool/lobby/spa etc.; describe those in words):
${hotelImgs.map((i) => `- [img:${i.id}] = ${i.label}`).join("\n")}
We have NO photos of nearby restaurants or attractions — describe those in words, never attach an image to them.
==== END PHOTO LIBRARY ====`
    : "";

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
- BOOKING: to book, they pick their dates in the "Rooms & availability" section and click Reserve on their chosen room — that opens the secure WhataHotel booking form with the room, rate, dates and advisor perks already filled in. Guide them there; don't ask for card details yourself.
- For destination facts (a café, a beach, the airport) you may use general knowledge, but frame timings/prices as "worth confirming".

RESPONSE STYLE
- Concise and easy to scan. Lead with the answer. No preamble ("Great question!"), no filler.
- Simple questions → 1–3 warm sentences. Richer questions (itineraries, room comparisons, "what should we do") → short intro + a tight bullet list.
- Use markdown: **bold** for names/labels, "- " bullet lists, numbered lists for itineraries/steps, and a compact markdown table ONLY when directly comparing 2–3 rooms or options.
- Explain room differences in plain language. When recommending, say WHY in a few words (privacy, view, space, value).
- Only SHOW photos when the guest EXPLICITLY asks to see them (e.g. "show me", "can I see", "photos", "pictures", "what does it look like"). Then use [img:ID] on its own line from the PHOTO LIBRARY below. Otherwise NEVER attach an image — describe in words. Never attach a photo to a nearby restaurant/attraction (we don't have those).
- To show a compact PREVIEW CARD of this property (photo, location and a link to its full page), output [hotel] on its own line. Use it when the guest wants an at-a-glance overview or a quick link to the hotel — not in every reply.
- If the guest names a DIFFERENT hotel they're interested in (not this one), output [findhotel:EXACT HOTEL NAME] on its own line — it renders a preview card + link to that hotel. Use the hotel's real, full name. Only for a specific named property.
- Add a brief, tasteful travel tip when it genuinely helps. Avoid large paragraphs.

PROACTIVE ADVISING
Read the guest's intent and tailor. If they mention an occasion or party, lead future answers with it:
- Honeymoon / anniversary → most private/romantic room, sunset spot, a couples' spa or private-dining idea.
- Family / children → family-friendly rooms, kids facilities, easy beaches, relaxed nearby dining.
- Business → efficient room, connectivity, quiet, transfer timing.
Offer a next helpful step (e.g. "Want a 3-day plan?" or "Shall I suggest the best room for two?") — one line, not pushy.

WHEN YOU CAN'T HELP (LAST RESORT — always try your best from the KNOWLEDGE BASE and your expertise first; only fall back to these if you truly can't)
- If the guest asks about a DIFFERENT hotel and you can't identify it, ask for its exact name and city so you can look it up.
- If, after genuinely trying, a hotel or place isn't available on WhataHotel, tell them warmly it isn't available at the moment and invite them to email info@lorrainetravel.com — the team will help arrange it.
- If you can't understand the question, politely ask them to rephrase or be a bit more specific.
- Never dead-end the guest: always help, ask one clarifying question, or point them to info@lorrainetravel.com.

MEMORY
Remember everything the guest has said this session (occasion, dates, party, preferences) and never re-ask it. Build on it.${
    memory.length
      ? `\n\nTRAVELLER MEMORY — things this guest has told us across their conversations on WhataHotel. Treat these as known; never re-ask them, and tailor proactively:\n${memory.map((m) => `- ${m}`).join("\n")}`
      : ""
  }

${dossier.brief}${imageLibrary}${bookingLibrary}`;

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
