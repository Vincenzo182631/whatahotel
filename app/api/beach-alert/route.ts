import { NextResponse } from "next/server";
import { getBeachCondition, beachAlertFrom } from "@/lib/services/beach-intelligence";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

// Lightweight beach-warning lookup for surfaces that stream plain text (the
// hotel-page and comparison advisors) and so can't carry a structured payload.
// Returns { alert } — null when the destination isn't a monitored coastal zone,
// its conditions are fine, or Beach Intelligence isn't configured.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Public + fans out to the Beach Intelligence service, so cap per-IP rate to
  // stop request amplification / cache-stuffing loops.
  if (await rateLimitExceeded(req, "beach-alert", 60, 60)) {
    return NextResponse.json({ alert: null }, { status: 429 });
  }

  const destination = new URL(req.url).searchParams
    .get("destination")
    ?.trim()
    .slice(0, 100); // destinations are short; don't cache-key arbitrary blobs
  if (!destination) return NextResponse.json({ alert: null });

  const beach = await getBeachCondition(destination).catch(() => null);
  const alert = beach ? beachAlertFrom(beach) : null;
  return NextResponse.json({ alert });
}
