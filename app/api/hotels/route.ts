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

  const minimal = (h: Awaited<ReturnType<typeof hotelDetailsService.getAllHotels>>[number]) => ({
    id: h.id,
    sourceHotelId: h.sourceHotelId,
    name: h.name,
    brand: h.brand,
    city: h.city,
    country: h.country,
    image: h.image,
    startingRate: h.startingRate,
    starRating: h.starRating,
    rating: h.rating,
  });

  // Every hotel, grouped by city (homepage sections). Cities ordered by size.
  if (searchParams.get("byCity")) {
    const all = await hotelDetailsService.getAllHotels();
    const grouped: Record<string, typeof all> = {};
    for (const h of all) (grouped[h.destinationKey] ??= []).push(h);
    const cities = Object.values(grouped)
      .map((list) => {
        // Ranked by price, lowest first.
        const sorted = [...list].sort((a, b) => a.startingRate - b.startingRate);
        return {
          key: sorted[0].destinationKey,
          label: sorted[0].city,
          country: sorted[0].country,
          count: sorted.length,
          hotels: sorted.map(minimal),
        };
      })
      .sort((a, b) => b.count - a.count);
    return NextResponse.json({ cities });
  }

  // Lightweight curated set for the homepage grid (a spread across destinations).
  if (searchParams.get("featured")) {
    const all = await hotelDetailsService.getAllHotels();
    const byCity: Record<string, typeof all> = {};
    for (const h of all) (byCity[h.destinationKey] ??= []).push(h);
    const featured: typeof all = [];
    for (const key of Object.keys(byCity)) {
      const sorted = [...byCity[key]].sort((a, b) => b.startingRate - a.startingRate);
      featured.push(...sorted.slice(0, 2));
    }
    return NextResponse.json({ hotels: featured.slice(0, 16).map(minimal) });
  }

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
