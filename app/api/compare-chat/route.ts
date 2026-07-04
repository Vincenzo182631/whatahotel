import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel } from "@/lib/services/live-rates";
import { streamGrounded } from "@/lib/ai/provider";
import { buildComparisonBrief } from "@/lib/ai/comparison-knowledge";
import { rateLimitExceeded, tooManyText } from "@/lib/security/rate-limit";
import type { Hotel } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

const PRIORITY_LABELS: Record<string, string> = {
  honeymoon: "a honeymoon (romance, privacy, views, couples' experiences)",
  family: "a family vacation (space, kids facilities, easy dining, connecting rooms)",
  business: "a business trip (efficiency, connectivity, quiet, transfers, location)",
  luxury: "a pure luxury stay (finest suites, service, dining, spa)",
  value: "the best value for money (rate vs. perks, inclusions, room quality)",
  adventure: "an adventure / active trip (location, activities, exploring the destination)",
};

/**
 * AI Travel Advisor for the side-by-side comparison page.
 *
 * Analyses the 2–3 selected hotels on ALL their real data (live rates + rooms,
 * amenities, advisor perks, guest ratings, location, dining, nearby POIs) and
 * either delivers an opinionated VERDICT (best pick + confidence + pros/cons,
 * weighted to the traveller's trip type) or answers a comparison question.
 * Streams token-by-token. Grounded strictly in the comparison brief.
 */
export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "compare-chat", 30, 60)) return tooManyText(60);

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean).slice(0, 3) : [];
  const checkIn = String(body.checkIn ?? "");
  const checkOut = String(body.checkOut ?? "");
  const question = String(body.question ?? "").trim();
  const priority = typeof body.priority === "string" ? body.priority : "";
  const history: { role: string; content: string }[] = Array.isArray(body.history)
    ? body.history.slice(-10)
    : [];
  const memory: string[] = Array.isArray(body.memory)
    ? body.memory.map((m: unknown) => String(m)).filter(Boolean).slice(0, 24)
    : [];

  if (ids.length < 2) return new Response("Select at least two hotels to compare.", { status: 400 });

  const resolved = await Promise.all(ids.map((id) => resolveHotel(id)));
  const hotels = resolved.filter((h): h is Hotel => Boolean(h));
  if (hotels.length < 2) return new Response("I couldn't load those hotels to compare.", { status: 404 });

  const { brief, anyLive, nights } = await buildComparisonBrief(hotels, checkIn, checkOut);
  const priorityLabel = priority && PRIORITY_LABELS[priority] ? PRIORITY_LABELS[priority] : "";
  const names = hotels.map((h) => h.name).join(", ");

  const system = `You are the WhataHotel Comparison Advisor — a seasoned luxury travel consultant helping a traveller decide between ${hotels.length} hotels they are comparing side by side: ${names}. You speak with warmth, authority and genuine expertise, like a top-tier advisor who knows these properties and their destinations first-hand. Never robotic, never generic.

YOUR JOB
Compare these hotels on everything that matters — live rate & value, room options, amenities & facilities, advisor-exclusive perks, guest ratings, location, on-site and nearby dining, nearby attractions/cafés, transport and the airport — then guide them to the RIGHT choice with clear reasoning and a confidence level.

GROUNDING — ABSOLUTE
- Use ONLY the COMPARISON SET facts below. Never invent rates, amenities, awards, room sizes, policies or perks.
- Only state a price that appears in the brief (the live, dated rate). If a hotel shows "no live availability" or "add dates", say so plainly rather than guessing.
- For nearby/area facts you may use reliable general knowledge, framed as "worth confirming".
- If a fact needed to judge something isn't in the brief, say what you'd confirm — don't fabricate.

HOW TO RESPOND
- Concise, warm, and easy to scan. Markdown: **bold** for hotel names and labels, "- " bullets, and a compact table only if directly lining up 2–3 rooms/metrics.
${priorityLabel ? `- The traveller is planning ${priorityLabel}. Weight your judgement and wording toward that.\n` : ""}
FOR A VERDICT (when there is no specific question), use exactly this shape:
**Top pick: <hotel> — Confidence <NN>%**
<1–2 sentences on why it wins${priorityLabel ? " for this trip" : ""}, citing concrete facts (rate, perks, rooms, rating, location).>

**At a glance**
- **<Hotel A>** — ✓ <one real strength> · ✕ <one honest trade-off>
- **<Hotel B>** — ✓ <strength> · ✕ <trade-off>
(one line per hotel)

**Best for** — <honeymoon → X; families → Y; value → Z> (only when the set clearly splits)

Set the confidence honestly: high (80–95%) when one hotel clearly leads on the facts/priority, moderate (55–75%) when it's close, and say what would tip it. Keep the whole verdict under ~160 words. No preamble.

FOR A QUESTION, answer it directly and comparatively in 1–4 tight sentences or a short bullet list, naming hotels and citing the real facts. End with a one-line recommendation when it helps.

WHEN YOU CAN'T HELP (LAST RESORT — always try your best from the comparison facts and your expertise first):
- If they ask about a hotel that isn't one of the ones being compared and you can't identify it, ask for its exact name and city.
- If, after genuinely trying, something isn't available on WhataHotel, say warmly it isn't available at the moment and invite them to email info@lorrainetravel.com — the team will help.
- If you can't understand the request, politely ask them to rephrase or be more specific.
- Never dead-end them: help, ask one clarifying question, or point them to info@lorrainetravel.com.
${
    memory.length
      ? `\nTRAVELLER MEMORY — things this guest has told us across their conversations. Treat as known; never re-ask, and weight your pick toward these:\n${memory.map((m) => `- ${m}`).join("\n")}\n`
      : ""
  }
${brief}${!anyLive && nights > 0 ? "\n\nNOTE: live rates came back unavailable for these dates — compare on inclusions, rooms and location, and suggest trying nearby dates for live pricing." : ""}`;

  const convo = history.length
    ? history.map((m) => `${m.role === "user" ? "Traveller" : "You"}: ${m.content}`).join("\n") + "\n"
    : "";
  const task = question
    ? `${convo}Traveller: "${question}"\n\nAnswer their comparison question now.`
    : `${convo}Give your VERDICT now${priorityLabel ? ` for ${priorityLabel}` : ""} — the best pick with confidence, a quick at-a-glance of each, and who each suits.`;

  const deterministic = () => {
    const lead = hotels[0].name;
    return `Comparing **${names}**. I'd start with **${lead}** for its balance of rooms, perks and location — tell me what matters most (honeymoon, family, business, value) and I'll weigh it precisely.`;
  };

  try {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          let any = false;
          for await (const delta of streamGrounded(system, task)) {
            any = true;
            controller.enqueue(enc.encode(delta));
          }
          if (!any) controller.enqueue(enc.encode(deterministic()));
        } catch {
          controller.enqueue(enc.encode(deterministic()));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(deterministic(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
