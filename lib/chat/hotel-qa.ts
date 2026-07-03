import type { Hotel } from "@/lib/services/types";

/**
 * Lightweight, dependency-free Q&A over a single hotel's data — powers the
 * docked advisor on the details page so it can answer "does it have connecting
 * rooms?", "how far is the airport?", etc. instantly and accurately. When an
 * LLM is configured you could route these through /api/chat instead.
 */
export function answerHotelQuestion(hotel: Hotel, question: string): string {
  const q = question.toLowerCase();
  const has = (a: string) => hotel.amenities.includes(a);
  const name = hotel.name;

  const findDistance = (kw: string) =>
    hotel.distances.find((d) => d.label.toLowerCase().includes(kw));

  // Distance / how far
  if (/how far|distance|near|close|walk|get to|from the/.test(q)) {
    // try to match a named place from the question against known distances
    const match = hotel.distances.find((d) =>
      q.includes(d.label.toLowerCase().split(" ")[0]),
    );
    if (match) return `${name} is ${match.value} from ${match.label}.`;
    if (/airport/.test(q)) {
      const air = findDistance("airport");
      return air
        ? `The nearest airport is ${air.value} away (${air.label}).`
        : `I can arrange a private transfer — let me confirm exact airport timings for you.`;
    }
    const list = hotel.distances
      .map((d) => `${d.label} (${d.value})`)
      .join(", ");
    return `Here's how ${name} sits relative to the highlights: ${list}.`;
  }

  if (/connecting|adjoining|interconnect/.test(q)) {
    return has("connecting")
      ? `Yes — ${name} offers connecting rooms, ideal for families or travelling together. I can hold two on request.`
      : `${name} doesn't market dedicated connecting rooms, but I can request adjacent rooms or a suite that sleeps your whole party.`;
  }
  if (/breakfast/.test(q)) {
    return has("breakfast")
      ? `Yes — daily breakfast for two is included as one of your advisor-exclusive perks at ${name}.`
      : `Breakfast isn't bundled by default, but I can add it to your rate — just say the word.`;
  }
  if (/airport|transfer|pick.?up|transport/.test(q)) {
    const air = findDistance("airport");
    return has("airporttransfer")
      ? `Yes — ${name} provides airport transfers${air ? ` (${air.label} is ${air.value} away)` : ""}. I'll arrange it with your booking.`
      : `I can organise a private car transfer for you${air ? `; ${air.label} is ${air.value} away` : ""}.`;
  }
  if (/view|eiffel|ocean|sea|fuji|matterhorn|strip/.test(q)) {
    if (has("oceanview"))
      return `The signature suites at ${name} have the finest views — ocean-facing, with the best light in the late afternoon.`;
    return `For the best outlook, I'd book a higher-category suite at ${name} — ${hotel.highlights[0]}. I'll request the best available aspect.`;
  }
  if (/spa|massage|wellness/.test(q)) {
    return has("spa")
      ? `Yes — ${name} has a wonderful spa. ${hotel.highlights.find((h) => /spa/i.test(h)) ?? "I can pre-book treatments for you."}`
      : `${name} doesn't have a full spa on site, but I can recommend treatments nearby.`;
  }
  if (/pool|swim/.test(q)) {
    return has("pool")
      ? `Yes — ${name} has a beautiful pool. ${hotel.highlights.find((h) => /pool/i.test(h)) ?? ""}`.trim()
      : `${name} doesn't have a pool, but I can suggest properties nearby that do.`;
  }
  if (/gym|fitness/.test(q)) {
    return has("gym")
      ? `Yes — there's a well-equipped fitness centre at ${name}.`
      : `There's no dedicated gym, but I can confirm fitness options for you.`;
  }
  if (/kid|child|family/.test(q)) {
    return has("kidsclub") || has("connecting")
      ? `${name} is excellent for families — ${has("kidsclub") ? "there's a kids' club" : "connecting rooms are available"} and the team is wonderful with children.`
      : `${name} is more grown-up in feel, but I can make it work beautifully for a family — ask me how.`;
  }
  if (/pet|dog/.test(q)) {
    return `Let me confirm the current pet policy at ${name} directly with the hotel for you.`;
  }
  if (/price|cost|rate|how much|expensive/.test(q)) {
    return `Tell me your check-in and check-out and I'll pull live rates for ${name} for those exact dates — your advisor rate includes ${hotel.perks.length} exclusive perks.`;
  }
  if (/perk|benefit|included|amenit/.test(q)) {
    return `Your advisor-exclusive perks at ${name}: ${hotel.perks.map((p) => p.label).join(", ")}.`;
  }
  if (/restaurant|dining|food|eat|michelin/.test(q)) {
    return has("michelin")
      ? `Dining is a highlight — ${name} offers Michelin-level cuisine. ${hotel.highlights.find((h) => /michelin|dining|restaurant|epicure|table/i.test(h)) ?? ""}`.trim()
      : `${name} has excellent dining on site, and I can book the best tables in town for you.`;
  }
  if (/best room|which room|suite|recommend/.test(q)) {
    return `For ${name}, I'd recommend the signature suite for the best space and views. Tell me your dates and I'll check availability.`;
  }

  // Fallback
  return `Great question about ${name}. ${hotel.shortPitch} Tell me your dates and what matters most, and I'll get you a precise answer and the best rate.`;
}

export const DOCKED_SUGGESTIONS = [
  "Show me the rooms",
  "Which room is best for a honeymoon?",
  "Best restaurants nearby?",
  "Plan me a 3-day itinerary",
  "How far is the airport?",
  "What are the advisor perks?",
  "Where should I watch the sunset?",
  "Is it good for families?",
];
