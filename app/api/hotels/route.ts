import { NextResponse } from "next/server";
import {
  advisorPerksService,
  hotelDetailsService,
  imagesService,
  pricingService,
  roomAvailabilityService,
} from "@/lib/services";

export const runtime = "nodejs";

/**
 * GET /api/hotels            -> all hotels (lightweight list)
 * GET /api/hotels?id=ritz-paris[&nights=3]
 *                            -> full bundle: hotel, rooms, perks, price quote
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    const hotels = await hotelDetailsService.getAllHotels();
    return NextResponse.json({ hotels });
  }

  const hotel = await hotelDetailsService.getHotelById(id);
  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  const nights = Number(searchParams.get("nights")) || 3;
  const [availability, perks] = await Promise.all([
    roomAvailabilityService.getAvailability(id),
    advisorPerksService.getPerks(id),
  ]);

  return NextResponse.json({
    hotel,
    gallery: imagesService.getGallery(hotel),
    rooms: availability.rooms,
    perks,
    quote: pricingService.quote(hotel, nights),
  });
}
