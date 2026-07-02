import { NextResponse } from "next/server";
import {
  getCityHotels,
  searchHotelsByName,
  getLiveHotel,
  type LiveHotel,
} from "@/lib/services/live-rates";

export const runtime = "nodejs";

/**
 * Live hotel search across the whole WhataHotel catalogue (any city/hotel).
 *   GET /api/live-search?city=Miami&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD[&guests=2]
 *   GET /api/live-search?q=Troon%20North
 *   GET /api/live-search?id=3048   (resolve one hotel by its WhataHotel id)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim();
  const q = searchParams.get("q")?.trim();
  const id = searchParams.get("id")?.trim();
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests")) || 2;

  // Resolve a specific hotel by id — guarantees the chosen hotel shows up even
  // when its exact name isn't in the search index.
  if (id) {
    const full = await getLiveHotel(id);
    const hotels: LiveHotel[] = full
      ? [
          {
            sourceHotelId: full.sourceHotelId,
            name: full.name,
            city: full.city,
            country: full.country,
            image: full.image,
            bookingUrl: full.bookingUrl,
            perks: full.perks,
          },
        ]
      : [];
    return NextResponse.json({ mode: "id", id, hotels });
  }

  if (city && checkIn && checkOut) {
    const hotels = await getCityHotels({ city, checkIn, checkOut, guests });
    return NextResponse.json({ mode: "city", city, hotels });
  }
  if (q) {
    const hotels = await searchHotelsByName(q);
    return NextResponse.json({ mode: "name", q, hotels });
  }
  return NextResponse.json(
    { error: "Provide ?id=, ?city=&checkIn=&checkOut=, or ?q=" },
    { status: 400 },
  );
}
