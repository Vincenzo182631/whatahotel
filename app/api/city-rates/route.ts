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

  const rates: Record<string, { nightly: number; currency: string }> = {};
  for (const r of cityRates) {
    const slug = bySource.get(r.hotelId);
    if (slug) rates[slug] = { nightly: r.nightly, currency: r.currency };
  }
  return NextResponse.json({ rates });
}
