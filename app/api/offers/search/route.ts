import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCityHotels, searchHotelsByName } from "@/lib/services/live-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

/**
 * Agent-only: search a city's hotels for building an offer. Returns the FULL
 * directory for the city (so the agent can curate any listed hotel), and
 * overlays an approximate nightly + an `available` flag on the hotels that have
 * live availability for the chosen dates. The offer page always re-fetches each
 * hotel's real live rate on open.
 */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get("city") || "").trim();
  const checkIn = (searchParams.get("checkIn") || "").trim();
  const checkOut = (searchParams.get("checkOut") || "").trim();
  if (!city) return NextResponse.json({ hotels: [] });

  const c = city.toLowerCase();
  const [avail, full] = await Promise.all([
    checkIn && checkOut ? getCityHotels({ city, checkIn, checkOut }) : Promise.resolve([]),
    searchHotelsByName(city),
  ]);

  // The full directory for this city (the search endpoint isn't date-filtered).
  // Match the term in the city OR name (a region's hotels sometimes carry a
  // specific town as `city`, e.g. Park Hyatt Zanzibar).
  const directory = full.filter((h) => {
    const hc = (h.city || "").toLowerCase();
    const nm = (h.name || "").toLowerCase();
    return nm.includes(c) || hc.includes(c) || (hc.length > 0 && c.includes(hc));
  });
  const priceById = new Map(avail.map((h) => [h.sourceHotelId, h.approxNightly]));

  // Union: full directory first, plus any date-available hotel not in it.
  const byId = new Map<string, { h: (typeof directory)[number]; nightly?: number }>();
  for (const h of directory) byId.set(h.sourceHotelId, { h, nightly: priceById.get(h.sourceHotelId) });
  for (const h of avail) if (!byId.has(h.sourceHotelId)) byId.set(h.sourceHotelId, { h, nightly: h.approxNightly });

  const hotels = [...byId.values()]
    .sort((a, b) => (a.nightly ?? Infinity) - (b.nightly ?? Infinity) || a.h.name.localeCompare(b.h.name))
    .map(({ h, nightly }) => ({
      sourceHotelId: h.sourceHotelId,
      name: h.name,
      city: h.city,
      country: h.country,
      image: h.image,
      approxNightly: nightly,
      available: nightly != null,
      perk: h.perks[0] ?? null,
    }));

  return NextResponse.json({ hotels });
}
