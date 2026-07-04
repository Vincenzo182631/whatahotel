import { NextResponse } from "next/server";
import { hotelDetailsService } from "@/lib/services";
import { getLiveRates } from "@/lib/services/live-rates";

export const runtime = "nodejs";

/**
 * GET /api/rates?id=<hotel-slug>&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD[&guests=2]
 *
 * Returns real, date-specific room rates + advisor perks fetched live from the
 * WhataHotel booking page. Falls back to an estimate (starting rate × nights)
 * when the live page can't be reached, so the UI always has something to show.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests")) || 2;

  if (!id) {
    return NextResponse.json({ error: "Missing hotel id" }, { status: 400 });
  }

  // Curated slug → its source id; any other id is treated as a live WhataHotel
  // source id directly (so live-city cards can fetch real rates too).
  const hotel = await hotelDetailsService.getHotelById(id);
  const sourceHotelId = hotel ? hotel.sourceHotelId : id;

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    return NextResponse.json(
      { error: "Provide valid checkIn and checkOut dates" },
      { status: 400 },
    );
  }

  // Try live rates from the source.
  if (sourceHotelId) {
    const live = await getLiveRates({ sourceHotelId, checkIn, checkOut, guests });
    if (live) {
      return NextResponse.json({
        id,
        name: hotel?.name ?? "",
        live: true,
        checkIn,
        checkOut,
        nights: live.nights,
        currency: live.currency,
        entryNightly: live.entryNightly,
        total: live.rooms[0]?.total ?? live.entryNightly * live.nights,
        rooms: live.rooms,
        perks: live.perks.length ? live.perks : (hotel?.perks ?? []),
      });
    }
  }

  // No live rate available for these dates — never show an estimated/synthetic
  // price. Return no price; the UI shows "Rate on request".
  return NextResponse.json({
    id,
    name: hotel?.name ?? "",
    live: false,
    checkIn,
    checkOut,
    nights,
    currency: "USD",
    entryNightly: 0,
    total: 0,
    rooms: [],
    perks: hotel?.perks ?? [],
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
  );
  return diff > 0 ? diff : 0;
}
