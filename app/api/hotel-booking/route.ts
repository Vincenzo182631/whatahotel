import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel } from "@/lib/services/live-rates";
import { buildBookingManifest } from "@/lib/services/hotel-booking";
import type { Hotel } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Returns the prefilled WhataHotel booking links for a hotel's available rooms on
 * the given dates (id -> url + room), so the chat client can turn the advisor's
 * `[book:id]` tags into real Reserve buttons. Same builder the /api/hotel-chat
 * prompt uses, so ids line up.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get("hotelId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  if (!hotelId || !checkIn || !checkOut) return Response.json({ bookings: [] });

  let hotel: Hotel | null = await hotelDetailsService.getHotelById(hotelId);
  if (!hotel) {
    const live = await getLiveHotel(hotelId);
    if (live) {
      hotel = {
        id: live.sourceHotelId, sourceHotelId: live.sourceHotelId, name: live.name,
        city: live.city, destinationKey: "", country: live.country,
        neighborhood: live.address || live.city, shortPitch: "", description: "",
        image: live.image, gallery: live.gallery, rating: 0, reviewCount: 0,
        starRating: 0, startingRate: 0, currency: "USD", amenities: [], highlights: [],
        perks: [], vibes: [], goodFor: [], distances: [],
        coordinates: live.coordinates ?? { lat: 0, lng: 0 },
      };
    }
  }
  if (!hotel) return Response.json({ bookings: [] });

  const bookings = await buildBookingManifest(hotel, checkIn, checkOut);
  return Response.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
}
