import { HOTELS, DESTINATIONS } from "@/lib/services/mock-data";
import { prestige } from "@/lib/services/recommendation-engine";
import { detectAmenityKeys, type HotelInfo } from "@/lib/services/live-rates";
import type { Hotel } from "@/lib/services/types";

/**
 * SEO "Hotel A vs Hotel B" comparison pages.
 *
 * Each pair of curated hotels gets one canonical, indexable URL —
 * /compare/<idA>-vs-<idB> with the two ids in alphabetical order — so searches
 * like "Four Seasons George V vs Ritz Paris" or "which is better, X or Y" land
 * on a page built for exactly that question. The verdict is deterministic and
 * explainable: every claim comes from catalogue data or the live hotel info
 * API, never invented.
 */

export const VS = "-vs-";

const byId = new Map(HOTELS.map((h) => [h.id, h]));
const bySourceId = new Map(
  HOTELS.filter((h) => h.sourceHotelId).map((h) => [h.sourceHotelId as string, h]),
);

export function getCatalogueHotel(id: string): Hotel | undefined {
  return byId.get(id);
}
export function getCatalogueHotelBySourceId(sourceId: string): Hotel | undefined {
  return bySourceId.get(sourceId);
}

/** Canonical slug: the two ids in alphabetical order, joined by "-vs-". */
export function comparisonSlug(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `${x}${VS}${y}`;
}
export function comparisonPath(a: string, b: string): string {
  return `/compare/${comparisonSlug(a, b)}`;
}

/** Split a slug back into two catalogue ids. Tries every "-vs-" position so an
 *  id that itself contained "-vs-" would still resolve. */
export function parseComparisonSlug(slug: string): { a: Hotel; b: Hotel } | null {
  let from = 0;
  for (;;) {
    const at = slug.indexOf(VS, from);
    if (at < 0) return null;
    const a = byId.get(slug.slice(0, at));
    const b = byId.get(slug.slice(at + VS.length));
    if (a && b && a.id !== b.id) return { a, b };
    from = at + 1;
  }
}

/** Where a hotel's own page lives (live /stay page when it has a source id). */
export function hotelHref(h: Hotel): string {
  return h.sourceHotelId ? `/stay/${h.sourceHotelId}` : `/hotel/${h.id}`;
}

export function cityLabel(h: Hotel): string {
  return DESTINATIONS[h.destinationKey]?.label.split(",")[0] ?? h.city;
}

// ---------------------------------------------------------------------------
// Which pairs to publish
// ---------------------------------------------------------------------------

/** How "headline" a hotel is — the hotels people actually compare by name are
 *  the prestige flags and five-stars, so those pairs are the ones worth indexing. */
function profile(h: Hotel): number {
  return prestige(h.brand) * 10 + h.starRating * 5 + h.perks.length + Math.min(h.startingRate, 5000) / 1000;
}

const TOP_PER_CITY = 8;

export function topHotelsForCity(cityKey: string, n = TOP_PER_CITY): Hotel[] {
  return HOTELS.filter((h) => h.destinationKey === cityKey)
    .sort((x, y) => profile(y) - profile(x) || x.name.localeCompare(y.name))
    .slice(0, n);
}

export interface ComparisonPair {
  a: Hotel;
  b: Hotel;
  path: string;
}

function pairsOf(hotels: Hotel[]): ComparisonPair[] {
  const out: ComparisonPair[] = [];
  for (let i = 0; i < hotels.length; i++)
    for (let j = i + 1; j < hotels.length; j++) {
      const [a, b] = [hotels[i], hotels[j]].sort((x, y) => x.id.localeCompare(y.id));
      out.push({ a, b, path: comparisonPath(a.id, b.id) });
    }
  return out;
}

/** Same-city pairs among each city's headline hotels — the sitemap set. */
export function featuredPairs(): ComparisonPair[] {
  return Object.keys(DESTINATIONS).flatMap((key) => pairsOf(topHotelsForCity(key)));
}

/** Pairs to link from a city page (internal linking helps them get crawled). */
export function cityPairs(cityKey: string, n = 12): ComparisonPair[] {
  return pairsOf(topHotelsForCity(cityKey)).slice(0, n);
}

/** Other comparisons featuring this hotel (same city), for related links. */
export function relatedPairs(hotel: Hotel, n = 6, exclude?: string): ComparisonPair[] {
  const rivals = topHotelsForCity(hotel.destinationKey, TOP_PER_CITY + 1).filter(
    (h) => h.id !== hotel.id && h.id !== exclude,
  );
  return rivals.slice(0, n).map((r) => {
    const [a, b] = [hotel, r].sort((x, y) => x.id.localeCompare(y.id));
    return { a, b, path: comparisonPath(a.id, b.id) };
  });
}

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

export const AMENITY_LABEL: Record<string, string> = {
  spa: "Spa",
  pool: "Pool",
  beachfront: "Beachfront",
  oceanview: "Ocean views",
  gym: "Fitness centre",
  golf: "Golf",
  parking: "Parking",
  pet: "Pet-friendly",
  kidsclub: "Kids' club",
  airporttransfer: "Airport transfers",
  butler: "Butler service",
  rooftop: "Rooftop",
  casino: "Casino",
  ski: "Ski access",
  connecting: "Connecting rooms",
  breakfast: "Breakfast",
  fireplace: "Fireplaces",
  michelin: "Michelin-starred dining",
};

export interface Side {
  hotel: Hotel;
  info: HotelInfo | null;
  coordinates?: { lat: number; lng: number };
}

export interface Category {
  label: string;
  winner: "a" | "b" | "tie";
  reason: string;
}

export interface Verdict {
  categories: Category[];
  pick: "a" | "b" | "tie";
  summary: string;
  chooseA: string[];
  chooseB: string[];
  amenitiesA: string[];
  amenitiesB: string[];
  distanceKm: number | null;
  faqs: { q: string; a: string }[];
}

function amenityKeys(s: Side): string[] {
  const blob = [
    s.info?.description ?? "",
    ...(s.info?.amenities ?? []),
    ...(s.info?.restaurants ?? []),
  ].join(" ");
  return [...new Set([...s.hotel.amenities, ...detectAmenityKeys(blob)])].filter(
    (k) => AMENITY_LABEL[k],
  );
}

/** Dollar value of explicit credits in the perks ("A $100 Hotel Credit"). */
function perkCredit(h: Hotel): number {
  return h.perks.reduce((sum, p) => {
    const m = p.label.match(/\$\s?(\d{2,5})/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

export function buildVerdict(A: Side, B: Side): Verdict {
  const a = A.hotel;
  const b = B.hotel;
  const cats: (Category & { weight: number })[] = [];

  // 1. Luxury tier — brand prestige, then stars.
  const pa = prestige(a.brand);
  const pb = prestige(b.brand);
  if (pa !== pb) {
    const [w, l] = pa > pb ? [a, b] : [b, a];
    cats.push({
      label: "Luxury pedigree",
      winner: pa > pb ? "a" : "b",
      weight: 3,
      reason: w.brand
        ? `${w.name} carries the ${w.brand} name — one of the most prestigious flags in luxury hotels${l.brand ? `, a tier above ${l.brand}` : ""}.`
        : `${w.name} sits in a higher luxury tier.`,
    });
  } else if (a.starRating !== b.starRating) {
    const aw = a.starRating > b.starRating;
    cats.push({
      label: "Luxury pedigree",
      winner: aw ? "a" : "b",
      weight: 2,
      reason: `${(aw ? a : b).name} is rated ${(aw ? a : b).starRating} stars to ${(aw ? b : a).starRating}.`,
    });
  } else {
    cats.push({
      label: "Luxury pedigree",
      winner: "tie",
      weight: 0,
      reason: `Both are ${a.starRating}-star hotels${a.brand && b.brand ? ` from top-tier flags (${a.brand} and ${b.brand})` : ""}.`,
    });
  }

  // 2. Value — indicative starting rate.
  if (a.startingRate > 0 && b.startingRate > 0) {
    const ratio = Math.max(a.startingRate, b.startingRate) / Math.min(a.startingRate, b.startingRate);
    if (ratio >= 1.1) {
      const aw = a.startingRate < b.startingRate;
      const [w, l] = aw ? [a, b] : [b, a];
      cats.push({
        label: "Value",
        winner: aw ? "a" : "b",
        weight: 2,
        reason: `${w.name} typically starts from about ${money(w.startingRate)} a night versus ${money(l.startingRate)} at ${l.name}.`,
      });
    } else {
      cats.push({
        label: "Value",
        winner: "tie",
        weight: 0,
        reason: `Both start from a similar rate — around ${money(Math.min(a.startingRate, b.startingRate))}–${money(Math.max(a.startingRate, b.startingRate))} a night.`,
      });
    }
  }

  // 3. Exclusive perks.
  const ca = perkCredit(a);
  const cb = perkCredit(b);
  const perkScoreA = a.perks.length + ca / 100;
  const perkScoreB = b.perks.length + cb / 100;
  if (a.perks.length || b.perks.length) {
    if (Math.abs(perkScoreA - perkScoreB) >= 1) {
      const aw = perkScoreA > perkScoreB;
      const w = aw ? a : b;
      const credit = aw ? ca : cb;
      cats.push({
        label: "Exclusive perks",
        winner: aw ? "a" : "b",
        weight: 2,
        reason: `${w.name} includes ${w.perks.length} complimentary WhataHotel perks${credit ? `, including ${money(credit)} in hotel credit` : ""}.`,
      });
    } else {
      cats.push({
        label: "Exclusive perks",
        winner: "tie",
        weight: 0,
        reason: `Both come with a similar set of complimentary WhataHotel perks.`,
      });
    }
  }

  // 4. Dining — only when the live info covers both.
  const ra = A.info?.restaurants.length ?? 0;
  const rb = B.info?.restaurants.length ?? 0;
  if (A.info && B.info && (ra || rb)) {
    if (ra !== rb) {
      const aw = ra > rb;
      cats.push({
        label: "Dining",
        winner: aw ? "a" : "b",
        weight: 1,
        reason: `${(aw ? a : b).name} has ${aw ? ra : rb} on-site restaurants and bars to ${aw ? rb : ra} at ${(aw ? b : a).name}.`,
      });
    } else {
      cats.push({ label: "Dining", winner: "tie", weight: 0, reason: `Each has ${ra} on-site restaurants and bars.` });
    }
  }

  // 5. Facilities.
  const amenitiesA = amenityKeys(A);
  const amenitiesB = amenityKeys(B);
  const onlyA = amenitiesA.filter((k) => !amenitiesB.includes(k));
  const onlyB = amenitiesB.filter((k) => !amenitiesA.includes(k));
  if (onlyA.length !== onlyB.length && (onlyA.length || onlyB.length)) {
    const aw = onlyA.length > onlyB.length;
    cats.push({
      label: "Facilities",
      winner: aw ? "a" : "b",
      weight: 1,
      reason: `${(aw ? a : b).name} adds ${list((aw ? onlyA : onlyB).map((k) => AMENITY_LABEL[k].toLowerCase()))}.`,
    });
  }

  const score = (side: "a" | "b") => cats.filter((c) => c.winner === side).reduce((s, c) => s + c.weight, 0);
  const sa = score("a");
  const sb = score("b");
  const pick: Verdict["pick"] = sa === sb ? "tie" : sa > sb ? "a" : "b";

  const winsFor = (side: "a" | "b") =>
    cats.filter((c) => c.winner === side).map((c) => c.label.toLowerCase());
  const chooseA = cats.filter((c) => c.winner === "a").map((c) => c.reason);
  const chooseB = cats.filter((c) => c.winner === "b").map((c) => c.reason);

  const city = cityLabel(a);
  const tieSummary = (): string => {
    const wa = winsFor("a");
    const wb = winsFor("b");
    if (wa.length && wb.length) {
      return `It's a genuinely close call — choose ${a.name} for ${list(wa)}, or ${b.name} for ${list(wb)}.`;
    }
    // Nothing separates them on paper: say what they share, then what decides it.
    const shared: string[] = [];
    if (a.starRating && a.starRating === b.starRating) shared.push(`${a.starRating}-star hotels`);
    if (prestige(a.brand) >= 9 && prestige(b.brand) >= 9) shared.push("from top-tier luxury flags");
    const similar: string[] = [];
    if (cats.some((c) => c.label === "Value" && c.winner === "tie")) similar.push("starting rates");
    if (cats.some((c) => c.label === "Exclusive perks" && c.winner === "tie")) similar.push("complimentary perks");
    return `It's a genuinely close call: ${a.name} and ${b.name} are both ${shared.length ? shared.join(" ") : "excellent hotels"}${
      similar.length ? ` with similar ${list(similar)}` : ""
    }, so neither has a clear edge on paper. Choose on location and the feel you're after — and compare live rates for your dates, as the better value can change from one date to the next.`;
  };

  const summary =
    pick === "tie"
      ? tieSummary()
      : (() => {
          const [w, l, ws, ls] = pick === "a" ? [a, b, "a", "b"] as const : [b, a, "b", "a"] as const;
          const lw = winsFor(ls);
          return `For most travellers, ${w.name} edges it — it leads on ${list(winsFor(ws))}.${lw.length ? ` ${l.name} is still the better pick if ${list(lw)} matter${lw.length > 1 ? "" : "s"} most to you.` : ""}`;
        })();

  const distanceKm =
    A.coordinates && B.coordinates ? Math.round(haversineKm(A.coordinates, B.coordinates) * 10) / 10 : null;

  // FAQs — mirrored exactly in the visible FAQ and the FAQPage schema.
  const faqs: Verdict["faqs"] = [
    { q: `Which is better, ${a.name} or ${b.name}?`, a: summary },
  ];
  if (a.startingRate > 0 && b.startingRate > 0) {
    const cheaper = a.startingRate <= b.startingRate ? a : b;
    const dearer = cheaper === a ? b : a;
    faqs.push({
      q: `Which is cheaper, ${a.name} or ${b.name}?`,
      a: `${cheaper.name} is typically the more affordable of the two, starting from about ${money(cheaper.startingRate)} a night versus ${money(dearer.startingRate)} at ${dearer.name}. Rates change by date, so compare live prices for your exact stay.`,
    });
  }
  if (a.perks.length || b.perks.length) {
    const pp = (h: Hotel) => (h.perks.length ? `${h.name}: ${list(h.perks.slice(0, 3).map((p) => p.label.replace(/\*+$/, "")))}` : `${h.name}: none listed`);
    faqs.push({
      q: `What perks do you get at ${a.name} and ${b.name}?`,
      a: `Booking through WhataHotel adds complimentary advisor perks. ${pp(a)}. ${pp(b)}.`,
    });
  }
  if (distanceKm != null) {
    faqs.push({
      q: `How far apart are ${a.name} and ${b.name}?`,
      a: `They're about ${distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`} apart in ${city}.`,
    });
  }
  if (A.info && B.info && (ra || rb)) {
    faqs.push({
      q: `Which has better dining, ${a.name} or ${b.name}?`,
      a:
        ra === rb
          ? `Both offer ${ra} on-site restaurants and bars.`
          : `${ra > rb ? a.name : b.name} has more on-site dining — ${Math.max(ra, rb)} restaurants and bars versus ${Math.min(ra, rb)}.`,
    });
  }

  return {
    categories: cats.map(({ weight: _w, ...c }) => c),
    pick,
    summary,
    chooseA,
    chooseB,
    amenitiesA,
    amenitiesB,
    distanceKm,
    faqs,
  };
}
