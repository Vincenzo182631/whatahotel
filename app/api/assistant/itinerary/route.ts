import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasFeature } from "@/lib/subscription/plans";
import { generateItinerary, type TravelerType } from "@/lib/ai/itinerary";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // The full AI Travel Advisor is a Premium benefit.
  if (!hasFeature(user.membership, "ai-advisor")) {
    return NextResponse.json(
      { error: "premium_required", message: "Upgrade to Premium to use the AI Travel Advisor." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const itinerary = generateItinerary({
    destinationKey: String(body.destinationKey ?? ""),
    hotelName: body.hotelName ? String(body.hotelName) : undefined,
    days: Number(body.days) || 3,
    travelerType: (["solo", "couple", "family", "business"].includes(body.travelerType)
      ? body.travelerType
      : user.profile.travelerType ?? "couple") as TravelerType,
    cuisine: body.cuisine ? String(body.cuisine) : undefined,
  });

  if (!itinerary)
    return NextResponse.json({ error: "We don't have a guide for that city yet." }, { status: 400 });

  return NextResponse.json({ itinerary });
}
