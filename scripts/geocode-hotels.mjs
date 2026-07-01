// One-time geocoding: resolve each hotel to lat/lng via the free OpenStreetMap
// Nominatim geocoder (1 req/sec per their usage policy). Resumable — re-run to
// fill only the gaps. Writes data/hotel-geo.json keyed by source hotelID.
//
//   node scripts/geocode-hotels.mjs [dataDir]
//
import fs from "node:fs";
import path from "node:path";

const DATA = process.argv[2] || "data";
const UA = "WhataHotelGeocoder/1.0 (info@lorrainetravel.com)";
const DELAY = 1100; // >= 1s per Nominatim policy

const COUNTRY = {
  Paris: "France",
  Tokyo: "Japan",
  Bali: "Indonesia",
  Maldives: "Maldives",
  "New York": "United States",
  London: "United Kingdom",
  Dubai: "United Arab Emirates",
  Maui: "United States",
};

const all = JSON.parse(fs.readFileSync(path.join(DATA, "whatahotel-hotels.json"), "utf8"));
const outFile = path.join(DATA, "hotel-geo.json");
const geo = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  if (!j[0]) return null;
  return { lat: +(+j[0].lat).toFixed(6), lng: +(+j[0].lon).toFixed(6) };
}

const run = async () => {
  let done = 0,
    hit = 0,
    miss = 0;
  for (const h of all) {
    if (!h.name || geo[h.hotelID]) continue; // skip empty names + already geocoded
    const country = COUNTRY[h.city] || "";
    const primary = `${h.name}, ${h.city}${country ? ", " + country : ""}`;
    try {
      let res = await geocode(primary);
      if (!res) {
        await sleep(DELAY);
        res = await geocode(`${h.name} ${h.city}`); // looser fallback
      }
      if (res) {
        geo[h.hotelID] = res;
        hit++;
        process.stdout.write(".");
      } else {
        miss++;
        process.stdout.write("_");
      }
    } catch {
      miss++;
      process.stdout.write("x");
    }
    done++;
    if (done % 20 === 0) fs.writeFileSync(outFile, JSON.stringify(geo, null, 2));
    await sleep(DELAY);
  }
  fs.writeFileSync(outFile, JSON.stringify(geo, null, 2));
  process.stdout.write(
    `\n\nDONE: processed ${done} (hit ${hit}, miss ${miss}). Total geocoded: ${Object.keys(geo).length}/${all.length}\nWrote ${outFile}\n`,
  );
};

run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
