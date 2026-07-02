import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import type { Trip } from "@/lib/data/types";
import { hotelBookingService, crmService } from "@/lib/integrations";

export const runtime = "nodejs";

function nights(a: string, b: string) {
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
  return d > 0 ? d : 0;
}

/**
 * Create a booking request in-app. There's no live transactional booking API,
 * so this records the request (persisted as an upcoming trip for signed-in
 * users) and returns a confirmation. hotelBookingService is the swap point for
 * a real booking provider later.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const sourceHotelId = String(b.sourceHotelId ?? "");
  const hotelName = String(b.hotelName ?? "").trim();
  const checkIn = String(b.checkIn ?? "");
  const checkOut = String(b.checkOut ?? "");
  const guestName = String(b.guestName ?? "").trim();
  const email = String(b.email ?? "").trim();

  const n = nights(checkIn, checkOut);
  if (!sourceHotelId || !hotelName || n <= 0) {
    return NextResponse.json({ error: "Missing hotel or valid dates." }, { status: 400 });
  }
  if (!guestName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a name and a valid email." }, { status: 400 });
  }

  const nightly = Number(b.nightly) || 0;
  const currency = String(b.currency || "USD");
  const confirmation = "WH-" + randomUUID().slice(0, 8).toUpperCase();

  // Placeholder for a real booking provider (returns "not configured" today).
  await hotelBookingService.createBooking({
    hotelId: sourceHotelId,
    checkIn,
    checkOut,
    guests: Number(b.guests) || 2,
    roomId: b.roomName,
  });

  // Persist as an upcoming trip when the guest is signed in.
  const user = await getCurrentUser();
  if (user) {
    const trip: Trip = {
      id: randomUUID(),
      userId: user.id,
      hotelId: sourceHotelId,
      hotelName,
      city: String(b.city ?? ""),
      country: String(b.country ?? ""),
      image: String(b.image ?? ""),
      checkIn,
      checkOut,
      status: "upcoming",
      nights: n,
      total: nightly * n,
      currency,
      confirmation,
      roomName: b.roomName ? String(b.roomName) : undefined,
      detailPath: `/stay/${sourceHotelId}`,
    };
    await store.addTrip(trip);
    await crmService.upsertContact({ email, name: guestName, tier: user.membership });
  }

  return NextResponse.json({ confirmation, saved: Boolean(user) });
}
