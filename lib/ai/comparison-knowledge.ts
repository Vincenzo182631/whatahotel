import { getLiveRates, getHotelInfo } from "@/lib/services/live-rates";
import { CITY_POIS } from "@/lib/ai/itinerary-data";
import { formatCurrency } from "@/lib/utils";
import type { Hotel } from "@/lib/services/types";

/**
 * Comparison knowledge assembler for the side-by-side advisor.
 *
 * Builds one structured brief covering all 2–3 hotels the traveller is
 * comparing, drawn from real data — dated live rates + room categories
 * (method=rates), amenities/dining/tax (method=info), curated advisor perks,
 * guest ratings, location, distances and curated destination POIs. Reuses the
 * same warm caches the /compare page just populated, so it's fast.
 *
 * Server-side only. The AI compares strictly on these facts — no fabrication.
 */

function readable(k: string): string {
  return k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
  return d > 0 ? d : 0;
}

const roomLabel = (name: string) => name.split(",")[0].trim();

export interface ComparisonBrief {
  brief: string;
  anyLive: boolean;
  nights: number;
}

/** Assemble the full comparison knowledge brief for the selected hotels. */
export async function buildComparisonBrief(
  hotels: Hotel[],
  checkIn: string,
  checkOut: string,
): Promise<ComparisonBrief> {
  const nights = nightsBetween(checkIn, checkOut);
  let anyLive = false;
  const blocks: string[] = [];

  let idx = 0;
  for (const h of hotels) {
    idx++;
    // Sequential — the source API throttles concurrent requests. Both are cached
    // from the page render, so this is usually instant.
    const rates =
      h.sourceHotelId && nights > 0
        ? await getLiveRates({ sourceHotelId: h.sourceHotelId, checkIn, checkOut }).catch(() => null)
        : null;
    const info = await getHotelInfo(h.name, h.city).catch(() => null);
    if (rates) anyLive = true;

    const rateLine = rates
      ? `${formatCurrency(rates.entryNightly, rates.currency)}/night · ${formatCurrency(
          rates.rooms[0]?.total ?? rates.entryNightly * Math.max(1, nights),
          rates.currency,
        )} total for ${nights} night${nights > 1 ? "s" : ""} (LIVE, taxes incl.)`
      : nights > 0
        ? "no live availability for these dates"
        : "add dates for live pricing";

    const rooms = rates?.rooms.length
      ? [...new Set(rates.rooms.map((r) => roomLabel(r.name)))]
          .slice(0, 6)
          .map((name) => {
            const cheapest = rates.rooms
              .filter((r) => roomLabel(r.name) === name)
              .sort((a, b) => a.nightly - b.nightly)[0];
            return `${name} (${formatCurrency(cheapest.nightly, rates.currency)})`;
          })
          .join(", ")
      : "shown at booking";

    const curatedAmenities = (h.amenities ?? []).map(readable);
    const liveAmenities = (info?.amenities ?? [])
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && s.length <= 40 && /[a-z]/.test(s) && !/\d+\.\d{2}/.test(s));
    const amenities = [...curatedAmenities, ...liveAmenities]
      .filter((s, i, a) => a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)
      .slice(0, 14);

    const perks = (h.perks ?? []).map((p) => p.label.replace(/\*+$/g, "").trim()).filter(Boolean);
    const dining = (info?.restaurants ?? []).slice(0, 6);
    const distances = (h.distances ?? []).map((d) => `${d.label}: ${d.value}`);
    const realAttractions = (info?.attractions ?? []).slice(0, 8);
    const roomTypes = (info?.roomTypes ?? []).map((r) => r.desc).slice(0, 6);
    const policies = (info?.policies ?? []).slice(0, 3);

    const key = (h.destinationKey || h.city).toLowerCase().replace(/[^a-z]/g, "");
    const pois = CITY_POIS[key] ?? null;
    const area = pois
      ? [
          `attractions: ${pois.attractions.map((x) => x.name).slice(0, 5).join(", ")}`,
          `restaurants nearby: ${pois.dining.map((x) => x.name).slice(0, 4).join(", ")}`,
          `cafés: ${pois.cafes.map((x) => x.name).slice(0, 2).join(", ")}`,
          `getting around: ${pois.transport}`,
        ].join("; ")
      : `use reliable general knowledge of ${h.city} for nearby spots and the nearest airport (frame as worth confirming)`;

    blocks.push(
      [
        `### HOTEL ${idx}: ${h.name}${h.brand ? ` (${h.brand})` : ""}`,
        `- Class: ${h.starRating ? `${h.starRating}-star` : "not stated"}${h.rating > 0 ? ` · Guest rating: ${h.rating}/10${h.reviewCount ? ` (${h.reviewCount} reviews)` : ""}` : ""}`,
        `- Live rate: ${rateLine}`,
        `- Room categories: ${rooms}`,
        roomTypes.length ? `- Room/suite types & sizes: ${roomTypes.join("; ")}` : "",
        `- Amenities: ${amenities.length ? amenities.join(", ") : "not individually listed"}`,
        `- On-site dining: ${dining.length ? dining.join(", ") : "not listed"}`,
        `- Advisor-exclusive perks: ${perks.length ? perks.join("; ") : "advisor perks apply"}`,
        `- Location: ${[h.neighborhood && h.neighborhood !== h.city ? h.neighborhood : "", h.city, h.country].filter(Boolean).join(", ")}`,
        distances.length ? `- Distances: ${distances.join("; ")}` : "",
        realAttractions.length
          ? `- Nearby (real, from the property — safe to cite): ${realAttractions.join(", ")}`
          : `- Nearby: ${area}`,
        policies.length ? `- Policies (real): ${policies.join(" | ")}` : "",
        info?.description ? `- About: ${info.description.length > 260 ? info.description.slice(0, 260) + "…" : info.description}` : "",
        info?.tax ? `- Taxes/fees note: ${info.tax.length > 160 ? info.tax.slice(0, 160) + "…" : info.tax}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const brief = [
    "==== COMPARISON SET (your single source of truth — compare ONLY on these facts) ====",
    ...blocks,
    "==== END COMPARISON SET ====",
  ].join("\n\n");

  return { brief, anyLive, nights };
}
