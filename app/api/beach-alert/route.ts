import { NextResponse } from "next/server";
import { getBeachCondition, beachAlertFrom } from "@/lib/services/beach-intelligence";

// Lightweight beach-warning lookup for surfaces that stream plain text (the
// hotel-page and comparison advisors) and so can't carry a structured payload.
// Returns { alert } — null when the destination isn't a monitored coastal zone,
// its conditions are fine, or Beach Intelligence isn't configured.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const destination = new URL(req.url).searchParams.get("destination")?.trim();
  if (!destination) return NextResponse.json({ alert: null });

  const beach = await getBeachCondition(destination).catch(() => null);
  const alert = beach ? beachAlertFrom(beach) : null;
  return NextResponse.json({ alert });
}
