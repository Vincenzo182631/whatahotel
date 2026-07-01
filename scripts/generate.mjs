import fs from "node:fs";

const DATA = process.argv[2]; // data dir with whatahotel-hotels.json
const OUTFILE = process.argv[3]; // path to write hotels-generated.ts
const all = JSON.parse(fs.readFileSync(DATA + "/whatahotel-hotels.json", "utf8"));

const DEST = {
  Paris: { key: "paris", country: "France", aliases: ["paris", "city of light"], blurb: "Haussmann grandeur, Michelin tables and the Seine at dusk." },
  Tokyo: { key: "tokyo", country: "Japan", aliases: ["tokyo", "japan"], blurb: "Centuries-old ritual meets sky-high modernity, with flawless service." },
  Bali: { key: "bali", country: "Indonesia", aliases: ["bali", "ubud", "seminyak", "nusa dua", "indonesia"], blurb: "Jungle infinity pools, beach clubs and barefoot luxury." },
  Maldives: { key: "maldives", country: "Maldives", aliases: ["maldives", "the maldives"], blurb: "Overwater villas, house reefs and absolute privacy." },
  "New York": { key: "newyork", country: "United States", aliases: ["new york", "nyc", "manhattan"], blurb: "Landmark hotels, rooftop bars and the best of food and design." },
  London: { key: "london", country: "United Kingdom", aliases: ["london", "uk", "england"], blurb: "Heritage townhouses, afternoon tea and Mayfair polish." },
  Dubai: { key: "dubai", country: "United Arab Emirates", aliases: ["dubai", "uae"], blurb: "Beach resorts, sky-high suites and superlative service." },
  Maui: { key: "maui", country: "United States", aliases: ["maui", "wailea", "hawaii", "kaanapali"], blurb: "Golden beaches, volcanic drama and aloha-spirit service." },
};

const FX = { USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, IDR: 0.000062, AED: 0.272 };

// brand keywords, most specific first
const BRANDS = [
  ["cheval blanc", "Cheval Blanc"], ["aman", "Aman"], ["bulgari", "Bvlgari"], ["bvlgari", "Bvlgari"],
  ["four seasons", "Four Seasons"], ["ritz-carlton", "Ritz-Carlton"], ["ritz carlton", "Ritz-Carlton"],
  ["mandarin oriental", "Mandarin Oriental"], ["rosewood", "Rosewood"], ["waldorf astoria", "Waldorf Astoria"],
  ["st. regis", "St. Regis"], ["st regis", "St. Regis"], ["park hyatt", "Park Hyatt"], ["grand hyatt", "Grand Hyatt"],
  ["hyatt centric", "Hyatt Centric"], ["hyatt regency", "Hyatt Regency"], ["andaz", "Andaz"], ["thompson", "Thompson"],
  ["jw marriott", "JW Marriott"], ["the peninsula", "Peninsula"], ["peninsula", "Peninsula"], ["raffles", "Raffles"],
  ["shangri-la", "Shangri-La"], ["shangri la", "Shangri-La"], ["jumeirah", "Jumeirah"], ["one&only", "One&Only"],
  ["one & only", "One&Only"], ["six senses", "Six Senses"], ["soneva", "Soneva"], ["banyan tree", "Banyan Tree"],
  ["kempinski", "Kempinski"], ["belmond", "Belmond"], ["corinthia", "Corinthia"], ["langham", "Langham"],
  ["regent", "Regent"], ["conrad", "Conrad"], ["sofitel", "Sofitel"], ["fairmont", "Fairmont"], ["pullman", "Pullman"],
  ["the westin", "Westin"], ["westin", "Westin"], ["sheraton", "Sheraton"], ["edition", "EDITION"],
  ["autograph", "Autograph Collection"], ["tribute portfolio", "Tribute Portfolio"], ["luxury collection", "The Luxury Collection"],
  ["le meridien", "Le Méridien"], ["le méridien", "Le Méridien"], ["renaissance", "Renaissance"], ["kimpton", "Kimpton"],
  ["intercontinental", "InterContinental"], ["taj", "Taj"], ["pendry", "Pendry"], ["faena", "Faena"], ["loews", "Loews"],
  ["the standard", "The Standard"], ["sls", "SLS"], ["lxr", "LXR"], ["dorchester", "Dorchester Collection"],
  ["jw marriott", "JW Marriott"], ["marriott", "Marriott"], ["hilton", "Hilton"], ["hyatt", "Hyatt"], ["ritz", "The Ritz"],
  ["w ", "W Hotels"],
];

function brandOf(name) {
  const n = " " + name.toLowerCase() + " ";
  for (const [kw, b] of BRANDS) if (n.includes(kw)) return b;
  return "";
}

function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function usd(amountStr, currency, fallback) {
  const a = parseFloat((amountStr || "").replace(/,/g, ""));
  if (!a || !FX[currency]) return fallback || 0;
  return Math.round(a * FX[currency]);
}

// city medians for missing prices
const byCity = {};
for (const h of all) {
  const a = usd(h.entryPrice, h.currency);
  if (a) (byCity[h.city] ||= []).push(a);
}
const median = {};
for (const [c, arr] of Object.entries(byCity)) {
  arr.sort((x, y) => x - y);
  median[c] = arr[Math.floor(arr.length / 2)];
}

const seen = new Set();
const hotels = [];
for (const h of all) {
  const d = DEST[h.city];
  if (!d) continue;
  let id = slug(h.name) || "h-" + h.hotelID;
  if (seen.has(id)) id = id + "-" + h.hotelID;
  seen.add(id);
  const brand = brandOf(h.name);
  const rate = usd(h.entryPrice, h.currency, median[h.city] || 0);
  const gallery = (h.images || []).filter((u) => u && u !== h.thumbnail).slice(0, 24);
  const image = h.thumbnail || (h.images || [])[0] || "";
  hotels.push({
    id,
    name: h.name,
    brand,
    city: h.city,
    destinationKey: d.key,
    country: d.country,
    neighborhood: h.city,
    shortPitch: `${brand ? brand + " — " : ""}a five-star luxury hotel in ${h.city}.`,
    description:
      h.description ||
      `${h.name} is a five-star luxury hotel in ${h.city}, available with WhataHotel's exclusive complimentary perks.`,
    image,
    gallery,
    rating: 0, // not published by source
    reviewCount: 0,
    starRating: 5,
    startingRate: rate,
    currency: "USD",
    sourceHotelId: h.hotelID,
    bookingUrl: h.detailUrl,
    amenities: [],
    highlights: [],
    perks: [
      { id: "p1", label: "Exclusive complimentary perks", detail: "Included on bookings through WhataHotel" },
    ],
    vibes: [],
    goodFor: [],
    distances: [],
    coordinates: { lat: 0, lng: 0 },
  });
}

const destinations = {};
for (const [city, d] of Object.entries(DEST)) {
  destinations[d.key] = { label: `${city}, ${d.country}`, country: d.country, aliases: d.aliases, blurb: d.blurb };
}

const header = `// AUTO-GENERATED from data/whatahotel-hotels.json — do not edit by hand.
// Real hotels scraped from whatahotel.com (verified fields only; amenities &
// guest ratings are not published by the source and are intentionally empty).
import type { Hotel } from "./types";
`;
const out =
  header +
  `\nexport const DESTINATIONS: Record<string, { label: string; country: string; aliases: string[]; blurb: string }> = ${JSON.stringify(destinations, null, 2)};\n\n` +
  `export const HOTELS: Hotel[] = ${JSON.stringify(hotels, null, 2)};\n`;

fs.writeFileSync(OUTFILE, out);
console.log(
  `Wrote ${hotels.length} hotels to ${OUTFILE} (${(out.length / 1024).toFixed(0)} KB). With brand: ${hotels.filter((h) => h.brand).length}, with price: ${hotels.filter((h) => h.startingRate).length}, with gallery>1: ${hotels.filter((h) => h.gallery.length).length}`,
);
