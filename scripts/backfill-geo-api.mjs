// Backfill missing hotel coordinates from WhataHotel's OWN source (method=hotel
// returns loc-lat / loc-long) — authoritative, and unlike name geocoding it
// doesn't depend on a fuzzy name match, so it fills the gaps Nominatim missed.
// Resumable: only fetches hotels absent from data/hotel-geo.json.
//
//   node scripts/backfill-geo-api.mjs [dataDir]
//
import fs from "node:fs";
import path from "node:path";

const DATA = process.argv[2] || "data";
const DELAY = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- env (WHATAHOTEL_API_URL / _KEY) from .env.local, no dep ---
function loadEnv() {
  const out = {};
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !(m[1] in out)) out[m[1]] = m[2].trim();
    }
  }
  return out;
}
const env = loadEnv();
const API_BASE = env.WHATAHOTEL_API_URL || "https://whatahotel.com/data/api.cfm";
const API_KEY = env.WHATAHOTEL_API_KEY;
if (!API_KEY) {
  console.error("Missing WHATAHOTEL_API_KEY (.env.local). Aborting.");
  process.exit(1);
}

// ColdFusion sometimes emits trailing commas — sanitise before JSON.parse.
function parseWah(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

async function fetchCoords(id) {
  const url = `${API_BASE}?method=hotel&hotel=${encodeURIComponent(id)}&apiKey=${encodeURIComponent(API_KEY)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = parseWah(await r.text());
  const wah = j.wahData;
  const ok = wah && (wah.status?.connection === 1 || ["100", "200"].includes(String(wah.status?.code)));
  const h = wah?.hotels?.[0];
  if (!ok || !h) return null;
  const lat = Number(h["loc-lat"]);
  const lng = Number(h["loc-long"]);
  return lat && lng ? { lat: +lat.toFixed(6), lng: +lng.toFixed(6) } : null;
}

const all = JSON.parse(fs.readFileSync(path.join(DATA, "whatahotel-hotels.json"), "utf8"));
const outFile = path.join(DATA, "hotel-geo.json");
const geo = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

const missing = all.filter((h) => h.hotelID && !(geo[h.hotelID] && geo[h.hotelID].lat));
console.log(`Catalogue: ${all.length} · already geocoded: ${Object.keys(geo).length} · to backfill: ${missing.length}\n`);

const run = async () => {
  let hit = 0,
    miss = 0,
    done = 0;
  for (const h of missing) {
    try {
      const res = await fetchCoords(h.hotelID);
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
    if (++done % 20 === 0) fs.writeFileSync(outFile, JSON.stringify(geo, null, 2));
    await sleep(DELAY);
  }
  fs.writeFileSync(outFile, JSON.stringify(geo, null, 2));
  console.log(
    `\n\nDONE: backfilled ${hit}, still missing ${miss}. Total geocoded: ${Object.keys(geo).length}/${all.length}\nWrote ${outFile}`,
  );
};

run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
