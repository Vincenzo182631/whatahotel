import { searchHotelsByName } from "@/lib/services/live-rates";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Look up hotels by name across the whole WhataHotel catalogue, so the chat
 * advisor can preview a DIFFERENT hotel the guest names (`[findhotel:<name>]`).
 * Returns the top matches (id, name, city, country, image). Cached upstream.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ hotels: [] });
  // Hits the upstream search — throttle to avoid abuse.
  if (await rateLimitExceeded(req, "hotel-search", 30, 60)) return Response.json({ hotels: [] });

  const results = await searchHotelsByName(q).catch(() => []);
  const hotels = results.slice(0, 3).map((h) => ({
    sourceHotelId: h.sourceHotelId,
    name: h.name,
    city: h.city,
    country: h.country,
    image: h.image,
  }));
  return Response.json({ hotels }, { headers: { "Cache-Control": "no-store" } });
}
