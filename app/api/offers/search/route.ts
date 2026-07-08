import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCityHotels } from "@/lib/services/live-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

/** Agent-only: search a city's hotels (with an approximate nightly, for picking). */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get("city") || "").trim();
  const checkIn = (searchParams.get("checkIn") || "").trim();
  const checkOut = (searchParams.get("checkOut") || "").trim();
  if (!city || !checkIn || !checkOut) {
    return NextResponse.json({ hotels: [] });
  }
  const hotels = await getCityHotels({ city, checkIn, checkOut });
  return NextResponse.json({
    hotels: hotels.map((h) => ({
      sourceHotelId: h.sourceHotelId,
      name: h.name,
      city: h.city,
      country: h.country,
      image: h.image,
      approxNightly: h.approxNightly,
      perk: h.perks[0] ?? null,
    })),
  });
}
