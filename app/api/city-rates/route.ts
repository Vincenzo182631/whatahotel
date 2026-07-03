import { NextResponse } from "next/server";
import { hotelDetailsService } from "@/lib/services";
import { getCityRates } from "@/lib/services/live-rates";

export const runtime = "nodejs";

/**
 * GET /api/city-rates?city=Paris&checkIn=&checkOut=[&guests=2]
 * Returns dated "from" nightly rates keyed by OUR hotel slug (mapped from the
 * API's numeric hotelID via sourceHotelId), for the compare wizard.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests")) || 2;

  const cityRates = await getCityRates({ city, checkIn, checkOut, guests });
  if (cityRates.length === 0) return NextResponse.json({ rates: {} });

  const all = await hotelDetailsService.getAllHotels();
  const bySource = new Map(all.filter((h) => h.sourceHotelId).map((h) => [h.sourceHotelId!, h.id]));

  // Keyed by BOTH our slug and the source id, so any card can look itself up.
  const rates: Record<string, { nightly: number; total: number; currency: string }> = {};
  for (const r of cityRates) {
    const entry = { nightly: r.nightly, total: r.total, currency: r.currency };
    rates[r.hotelId] = entry;
    const slug = bySource.get(r.hotelId);
    if (slug) rates[slug] = entry;
  }
  return NextResponse.json({ rates });
}
