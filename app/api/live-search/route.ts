import { NextResponse } from "next/server";
import { getCityHotels, searchHotelsByName } from "@/lib/services/live-rates";

export const runtime = "nodejs";

/**
 * Live hotel search across the whole WhataHotel catalogue (any city/hotel).
 *   GET /api/live-search?city=Miami&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD[&guests=2]
 *   GET /api/live-search?q=Troon%20North
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim();
  const q = searchParams.get("q")?.trim();
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests")) || 2;

  if (city && checkIn && checkOut) {
    const hotels = await getCityHotels({ city, checkIn, checkOut, guests });
    return NextResponse.json({ mode: "city", city, hotels });
  }
  if (q) {
    const hotels = await searchHotelsByName(q);
    return NextResponse.json({ mode: "name", q, hotels });
  }
  return NextResponse.json(
    { error: "Provide either ?city=&checkIn=&checkOut= or ?q=" },
    { status: 400 },
  );
}
