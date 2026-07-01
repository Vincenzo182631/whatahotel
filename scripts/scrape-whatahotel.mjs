import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] || ".";
const ONLY = process.argv[3] || ""; // optional: only this city name
const BASE = "https://whatahotel.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CI = "2026-08-10";
const CO = "2026-08-12";

const CITIES = [
  { city: "Paris", id: 207 },
  { city: "Tokyo", id: 311 },
  { city: "Bali", id: 23 },
  { city: "Maldives", id: 160 },
  { city: "New York", id: 192 },
  { city: "London", id: 150 },
  { city: "Dubai", id: 79 },
  { city: "Maui", id: 327 },
].filter((c) => !ONLY || c.city.toLowerCase() === ONLY.toLowerCase());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = await r.arrayBuffer();
      return new TextDecoder("utf-8").decode(buf);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

function decode(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCity(html) {
  const ulMatch = html.match(/<ul class="hotelThumbs">([\s\S]*?)<\/ul>/i);
  const scope = ulMatch ? ulMatch[1] : html;
  const items = [];
  const liRe = /<li>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(scope))) {
    const li = m[1];
    const id = li.match(/showRates\.cfm\?hotelID=(\d+)/i);
    if (!id) continue;
    const thumb = li.match(/url\(([^)]+)\)/i);
    const price = li.match(/rateBadge_price">\s*([^<]*?)\s*</i);
    items.push({
      hotelID: id[1],
      thumbnail: thumb ? abs(thumb[1].trim()) : "",
      priceRaw: price ? decode(price[1]) : "",
    });
  }
  return items;
}

function abs(u) {
  if (!u) return "";
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("/")) return BASE + u;
  return u;
}

function splitPrice(raw) {
  if (!raw) return { amount: "", currency: "" };
  const numMatch = raw.match(/[\d.,]+/);
  const curMatch = raw.match(/[A-Z]{3}/);
  let currency = curMatch ? curMatch[0] : "";
  if (!currency) {
    if (raw.includes("€")) currency = "EUR";
    else if (raw.includes("£")) currency = "GBP";
    else if (raw.includes("$")) currency = "USD";
  }
  return { amount: numMatch ? numMatch[0] : "", currency };
}

const CHROME =
  /logo|\/img\/|sprite|icon|flag|placeholder|spacer|pixel|\/css\/|blank\.|loading|favicon|\/content\/(general|cities)\//i;

function parseDetail(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = h1 ? decode(h1[1]) : "";
  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  const ogImg = [
    ...html.matchAll(
      /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi,
    ),
  ].map((x) => abs(x[1]));

  const urls = new Set(ogImg.filter((u) => u && !CHROME.test(u)));
  const imgRe =
    /(?:https?:)?\/\/[^\s"'()<>]+\.(?:jpe?g|png|webp)|\/content\/[^\s"'()<>]+\.(?:jpe?g|png|webp)/gi;
  let m;
  while ((m = imgRe.exec(html))) {
    const u = abs(m[0]);
    if (!CHROME.test(u)) urls.add(u);
  }
  return {
    name,
    description: metaDesc ? decode(metaDesc[1]) : "",
    images: [...urls],
  };
}

async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      await sleep(120);
    }
  });
  await Promise.all(workers);
  return out;
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const run = async () => {
  const all = [];
  for (const c of CITIES) {
    const cityHtml = await get(`${BASE}/cities/${c.id}/${c.city.replace(/ /g, "-")}.html`);
    const listed = parseCity(cityHtml);
    process.stdout.write(`\n${c.city}: ${listed.length} hotels\n`);
    const enriched = await pool(listed, 5, async (h) => {
      try {
        const d = await get(
          `${BASE}/booking/showRates.cfm?hotelID=${h.hotelID}&guests=2&checkIn=${CI}&checkOut=${CO}`,
        );
        const det = parseDetail(d);
        const { amount, currency } = splitPrice(h.priceRaw);
        process.stdout.write(".");
        return {
          city: c.city,
          name: det.name,
          hotelID: h.hotelID,
          detailUrl: `${BASE}/booking/showRates.cfm?hotelID=${h.hotelID}`,
          entryPrice: amount,
          currency,
          priceRaw: h.priceRaw,
          description: det.description,
          thumbnail: h.thumbnail,
          imageCount: det.images.length,
          images: det.images,
        };
      } catch (e) {
        process.stdout.write("x");
        return {
          city: c.city,
          name: "",
          hotelID: h.hotelID,
          detailUrl: `${BASE}/booking/showRates.cfm?hotelID=${h.hotelID}`,
          entryPrice: "",
          currency: "",
          priceRaw: h.priceRaw,
          description: "",
          thumbnail: h.thumbnail,
          imageCount: 0,
          images: [],
          error: String(e.message || e),
        };
      }
    });
    all.push(...enriched);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "whatahotel-hotels.json"), JSON.stringify(all, null, 2));

  // hotels CSV (images pipe-joined)
  const cols = [
    "city",
    "name",
    "hotelID",
    "detailUrl",
    "entryPrice",
    "currency",
    "priceRaw",
    "thumbnail",
    "imageCount",
    "description",
    "images",
  ];
  const rows = [cols.join(",")];
  for (const h of all) {
    rows.push(
      cols
        .map((k) => (k === "images" ? csvCell(h.images.join(" | ")) : csvCell(h[k])))
        .join(","),
    );
  }
  fs.writeFileSync(path.join(OUT, "whatahotel-hotels.csv"), rows.join("\n"));

  // images CSV (one row per image)
  const imgRows = ["city,hotelName,hotelID,imageUrl"];
  for (const h of all)
    for (const img of h.images)
      imgRows.push([csvCell(h.city), csvCell(h.name), h.hotelID, csvCell(img)].join(","));
  fs.writeFileSync(path.join(OUT, "whatahotel-hotel-images.csv"), imgRows.join("\n"));

  const totalImgs = all.reduce((s, h) => s + h.imageCount, 0);
  process.stdout.write(
    `\n\nDONE: ${all.length} hotels, ${totalImgs} images across ${CITIES.length} cities\n`,
  );
};

run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
