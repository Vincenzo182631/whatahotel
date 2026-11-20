/**
 * Search-snippet description for a hotel page (/stay/[id]).
 *
 * Every hotel page used to fall back to the site-wide default description, so ~370 pages
 * shared one snippet in Google. This builds one from the hotel's own data: name and place,
 * the first sentence of its location description when there is one, and its perks.
 * Kept under ~155 characters so Google shows it whole.
 */
import type { HotelInfo, LiveHotelFull } from "@/lib/services/live-rates";

const MAX = 155;

/** Plain-language versions of the perk labels the booking source uses, most appealing first. */
function perkPhrase(label: string): { rank: number; text: string } | null {
  const l = label.toLowerCase();
  if (/breakfast/.test(l)) return { rank: 0, text: "daily breakfast for two" };
  const credit = label.match(/\$\s?(\d[\d,]*)/);
  if (credit && /credit/.test(l)) return { rank: 1, text: `a $${credit[1]} hotel credit` };
  if (/upgrade/.test(l)) return { rank: 2, text: "a room upgrade when available" };
  if (/check-?in|check-?out/.test(l)) return { rank: 3, text: "flexible check-in and check-out" };
  return null;
}

/** "City, Country" without repeating what the hotel name already says ("Bvlgari Hotel Paris, France"). */
function placeFor(hotel: LiveHotelFull): string {
  const name = hotel.name.toLowerCase();
  const parts = [hotel.city, hotel.country].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts
    .filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i)
    .filter((p) => !name.includes(p.toLowerCase()))
    .join(", ");
}

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** First sentence of the hotel's location text, if it is a useful length. */
function firstSentence(text?: string): string | null {
  if (!text) return null;
  const clean = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  const sentence = clean.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? clean;
  return sentence.length >= 30 && sentence.length <= 110 ? sentence : null;
}

export function stayMetaDescription(hotel: LiveHotelFull, info?: HotelInfo | null): string {
  const place = placeFor(hotel);
  const name = place ? `${hotel.name.trim()}, ${place}` : hotel.name.trim();
  const perks = [
    ...new Set(
      hotel.perks
        .map(perkPhrase)
        .filter((p): p is { rank: number; text: string } => Boolean(p))
        .sort((a, b) => a.rank - b.rank)
        .map((p) => p.text),
    ),
  ].slice(0, 2);
  const perkLine = perks.length
    ? `WhataHotel! perks include ${joinAnd(perks)}.`
    : "Book with WhataHotel! VIP perks.";
  const about = firstSentence(info?.description);

  const candidates = [
    about ? `${name}. ${about} ${perkLine}` : null,
    `${name}: rooms, photos and live rates. ${perkLine}`,
    `${name}: rooms, photos and live rates, with WhataHotel! perks.`,
    `${name}. Live rates and WhataHotel! perks.`,
  ].filter((c): c is string => Boolean(c));

  const fit = candidates.find((c) => c.length <= MAX);
  if (fit) return fit;
  // Very long hotel names: cut at a word boundary.
  const last = candidates[candidates.length - 1];
  return `${last.slice(0, MAX - 1).replace(/\s+\S*$/, "")}…`;
}
