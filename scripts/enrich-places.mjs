/**
 * Google Places enrichment (run once; re-run to refresh).
 *
 *   1. Enable "Places API (New)" in Google Cloud, create an API key.
 *   2. Put it in .env.local as GOOGLE_PLACES_API_KEY (or pass GOOGLE_PLACES_API_KEY=... inline).
 *   3. node scripts/enrich-places.mjs
 *
 * Writes data/place-enrichment.json keyed by WhataHotel hotelID:
 *   { "<hotelID>": { rating: <0–10>, reviewCount: <n>, photos: [<googleusercontent urls>] } }
 *
 * The photo URLs are Google's permanent CDN links (no API key in them), so the
 * app serves them directly — no per-view cost and no key exposure.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// load GOOGLE_PLACES_API_KEY from env or .env.local
let KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) {
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    KEY = (env.match(/^GOOGLE_PLACES_API_KEY=(.+)$/m) || [])[1]?.trim();
  } catch {}
}
if (!KEY) {
  console.error("Missing GOOGLE_PLACES_API_KEY (set it in .env.local). Aborting.");
  process.exit(1);
}

const MAX_PHOTOS = 5;
const hotels = JSON.parse(fs.readFileSync(path.join(ROOT, "data/whatahotel-hotels.json"), "utf8"));
const outPath = path.join(ROOT, "data/place-enrichment.json");
const cache = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchPlace(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.rating,places.userRatingCount,places.photos",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) throw new Error("search HTTP " + res.status + " " + (await res.text()).slice(0, 140));
  const json = await res.json();
  return json.places?.[0] ?? null;
}

async function photoUrl(name) {
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1600&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": KEY } },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.photoUri || null;
}

async function enrichOne(h) {
  if (cache[h.hotelID]?.photos?.length) return "cached";
  const place = await searchPlace(`${h.name}, ${h.city}`);
  if (!place) return "notfound";
  const photos = [];
  for (const p of (place.photos || []).slice(0, MAX_PHOTOS)) {
    const u = await photoUrl(p.name);
    if (u) photos.push(u);
    await sleep(60);
  }
  cache[h.hotelID] = {
    rating: place.rating ? Math.round(place.rating * 2 * 10) / 10 : undefined, // 0–5 → 0–10
    reviewCount: place.userRatingCount ?? undefined,
    photos,
    googlePlaceId: place.id,
  };
  return photos.length ? "ok" : "norating";
}

async function pool(items, size) {
  let i = 0,
    done = 0;
  const stats = {};
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const h = items[i++];
        try {
          const r = await enrichOne(h);
          stats[r] = (stats[r] || 0) + 1;
        } catch (e) {
          stats.error = (stats.error || 0) + 1;
          if ((stats.error || 0) <= 3) console.error("\n" + h.name + ": " + e.message);
        }
        done++;
        if (done % 20 === 0) {
          fs.writeFileSync(outPath, JSON.stringify(cache, null, 2)); // checkpoint
          process.stdout.write(`\r${done}/${items.length} ${JSON.stringify(stats)}   `);
        }
        await sleep(80);
      }
    }),
  );
  return stats;
}

const stats = await pool(hotels, 4);
fs.writeFileSync(outPath, JSON.stringify(cache, null, 2));
const withRating = Object.values(cache).filter((c) => c.rating).length;
const withPhotos = Object.values(cache).filter((c) => c.photos?.length).length;
console.log(
  `\n\nDONE: ${Object.keys(cache).length} hotels enriched; ${withRating} with rating, ${withPhotos} with photos.\nWrote ${outPath}`,
);
