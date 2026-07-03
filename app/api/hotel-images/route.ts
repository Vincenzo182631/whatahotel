import { hotelDetailsService } from "@/lib/services";
import { getLiveHotel } from "@/lib/services/live-rates";
import { buildHotelImageManifest } from "@/lib/services/hotel-images";
import type { Hotel } from "@/lib/services/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Returns the hotel's real image manifest (id → url + label) so the chat client
 * can resolve the `[img:ID]` tags the advisor emits into actual photos. Same
 * builder the /api/hotel-chat prompt uses, so ids line up.
 */
export async function GET(req: Request) {
  const hotelId = new URL(req.url).searchParams.get("hotelId") ?? "";
  if (!hotelId) return Response.json({ images: [] });

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
  if (!hotel) return Response.json({ images: [] });

  const images = await buildHotelImageManifest(hotel);
  return Response.json(
    { images },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
