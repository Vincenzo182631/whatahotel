import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel, getHotelInfo } from "@/lib/services/live-rates";
import { streamGrounded } from "@/lib/ai/provider";
import { answerHotelQuestion } from "@/lib/chat/hotel-qa";
import { CITY_POIS } from "@/lib/ai/itinerary-data";
import type { Hotel } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Conversational advisor for a single hotel page. Answers questions about the
 * hotel (grounded in its real amenities, perks, distances) and its surrounding
 * area (nearby attractions, dining, cafés, the airport) using the curated POIs,
 * streamed from the LLM. Falls back to the deterministic Q&A when no LLM.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const hotelId = String(body.hotelId ?? "");
  const question = String(body.question ?? "").trim();
  const history: { role: string; content: string }[] = Array.isArray(body.history) ? body.history.slice(-6) : [];
  if (!question) return new Response("Ask me something about this hotel.", { status: 400 });

  // Resolve the hotel (curated slug first, then a live id).
  let hotel: Hotel | null = await hotelDetailsService.getHotelById(hotelId);
  let liveAmenities: string[] = [];
  let liveDining: string[] = [];
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
  const key = (h.destinationKey || h.city).toLowerCase().replace(/[^a-z]/g, "");
  const pois = CITY_POIS[key] ?? null;

  // No LLM → deterministic answer, sent as a single chunk.
  const fallback = () => new Response(answerHotelQuestion(h, question), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

  const amenities = h.amenities.length ? h.amenities.join(", ") : liveAmenities.slice(0, 12).join(", ");
  const facts = [
    `Hotel: ${h.name}${h.brand ? ` (${h.brand})` : ""}`,
    `Location: ${[h.neighborhood, h.city, h.country].filter(Boolean).join(", ")}`,
    h.description ? `About: ${h.description}` : "",
    amenities ? `Amenities: ${amenities}` : "",
    h.perks.length ? `Advisor-exclusive perks: ${h.perks.map((p) => p.label).join("; ")}` : "",
    h.distances.length ? `Distances: ${h.distances.map((d) => `${d.label} ${d.value}`).join(", ")}` : "",
    liveDining.length ? `On-site dining: ${liveDining.slice(0, 5).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const area = pois
    ? `Nearby (${h.city}) — attractions: ${pois.attractions.map((x) => x.name).join(", ")}; dining: ${pois.dining.map((x) => x.name).join(", ")}; cafés: ${pois.cafes.map((x) => x.name).join(", ")}; museums: ${pois.museums.map((x) => x.name).join(", ")}; getting around: ${pois.transport}`
    : `Use general knowledge of ${h.city} for nearby attractions, dining and the nearest airport.`;

  const system = `You are the WhataHotel Advisor helping a guest who is viewing ${h.name}. Be warm, precise and BRIEF — 1–3 sentences, answer-first, no filler or preamble.
Ground every answer in the FACTS. NEVER invent hotel amenities, perks, ratings or prices. If a rate/price comes up, tell them to pick their dates in the "Rooms & availability" section on this page for live rates — never quote a number.
For questions about the AREA (nearby attractions, restaurants, cafés, the nearest airport, getting around) you MAY use the NEARBY list and general local knowledge, framed as things to confirm.
If they say "book" or want to reserve, tell them to choose their dates and a room in the Rooms section below.

FACTS:
${facts}

${area}`;

  const convo = history.length
    ? history.map((m) => `${m.role === "user" ? "Guest" : "You"}: ${m.content}`).join("\n") + "\n"
    : "";

  try {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          let any = false;
          for await (const delta of streamGrounded(system, `${convo}Guest: "${question}"\n\nAnswer now.`)) {
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
