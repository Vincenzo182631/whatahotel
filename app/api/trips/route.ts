import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const trips = await store.listTrips(user.id);
  const now = Date.now();
  // Re-derive status from dates so seeded fixtures stay correct over time.
  const withStatus = trips.map((t) => ({
    ...t,
    status: new Date(t.checkOut).getTime() < now ? ("past" as const) : ("upcoming" as const),
  }));
  return NextResponse.json({
    upcoming: withStatus
      .filter((t) => t.status === "upcoming")
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    past: withStatus
      .filter((t) => t.status === "past")
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
  });
}
