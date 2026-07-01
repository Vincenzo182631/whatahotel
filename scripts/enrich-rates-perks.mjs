// One-time enrichment: fetch each hotel's real advisor perks + current entry
// rate from whatahotel.com/booking/showRates.cfm, derive amenity keys, and write
// data/hotel-enrichment.json keyed by source hotelID. mock-data.ts overlays this
// on top of the generated inventory.
//
//   node scripts/enrich-rates-perks.mjs [dataDir]
//
import fs from "node:fs";
import path from "node:path";

const DATA = process.argv[2] || "data";
const BASE = "https://whatahotel.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
// Sample stay used only to load a live rates page (perks are date-independent).
const CHECK_IN = "2026-09-15";
const CHECK_OUT = "2026-09-18";
const NIGHTS = 3;
const FX = { USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, IDR: 0.000062, AED: 0.272 };

const all = JSON.parse(fs.readFileSync(path.join(DATA, "whatahotel-hotels.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode(s) {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

function parsePerks(html) {
  const block = html.match(/perksList([\s\S]*?)<\/ul>/i);
  if (!block) return [];
  return [...block[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => decode(m[1]))
    .filter(Boolean)
    .map((label, i) => ({
      id: `perk-${i + 1}`,
      label: label.replace(/\*+$/g, "").trim(),
      detail: "Complimentary with your WhataHotel booking",
    }));
}

function parseEntryRate(html) {
  const heads = [...html.matchAll(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi)].map((m) => decode(m[1]));
  let best = null;
  for (const h of heads) {
    const m = h.match(/Starting at:\s*([\d.,]+)\s*([A-Z]{3})/i);
    if (!m) continue;
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (n && (!best || n < best.nightly)) best = { nightly: Math.round(n), currency: m[2].toUpperCase() };
  }
  return best;
}

const AMEN = [
  [/breakfast/, "breakfast"],
  [/butler/, "butler"],
  [/spa\b|wellness/, "spa"],
  [/\bpool/, "pool"],
  [/beach|beachfront/, "beachfront"],
  [/michelin/, "michelin"],
  [/gym|fitness/, "gym"],
  [/rooftop/, "rooftop"],
  [/kids|children|family/, "kidsclub"],
  [/airport|transfer|chauffeur|limousine/, "airporttransfer"],
  [/ocean ?view|sea ?view/, "oceanview"],
  [/casino/, "casino"],
  [/\bski\b/, "ski"],
];

function deriveAmenities(text) {
  const t = (text || "").toLowerCase();
  const out = [];
  for (const [re, key] of AMEN) if (re.test(t) && !out.includes(key)) out.push(key);
  return out;
}

function usd(nightly, currency) {
  if (!nightly || !FX[currency]) return 0;
  return Math.round(nightly * FX[currency]);
}

async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      await sleep(100);
    }
  });
  await Promise.all(workers);
  return out;
}

const run = async () => {
  const enrichment = {};
  let ok = 0,
    withPerks = 0,
    withRate = 0,
    failed = 0;

  await pool(all, 6, async (h) => {
    const url = `${BASE}/booking/showRates.cfm?hotelID=${h.hotelID}&guests=2&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}`;
    try {
      const html = await get(url);
      const perks = parsePerks(html);
      const entry = parseEntryRate(html);
      const amenities = deriveAmenities(
        `${h.name} ${h.description} ${perks.map((p) => p.label).join(" ")}`,
      );
      const rec = { perks, amenities };
      if (entry) {
        rec.startingRate = usd(entry.nightly, entry.currency);
        rec.localRate = entry.nightly;
        rec.localCurrency = entry.currency;
      }
      enrichment[h.hotelID] = rec;
      ok++;
      if (perks.length) withPerks++;
      if (entry) withRate++;
      process.stdout.write(".");
    } catch (e) {
      failed++;
      process.stdout.write("x");
    }
  });

  const outFile = path.join(DATA, "hotel-enrichment.json");
  fs.writeFileSync(outFile, JSON.stringify(enrichment, null, 2));
  process.stdout.write(
    `\n\nDONE: ${ok}/${all.length} hotels enriched (${withPerks} with perks, ${withRate} with live rate, ${failed} failed)\nWrote ${outFile}\n`,
  );
};

run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
