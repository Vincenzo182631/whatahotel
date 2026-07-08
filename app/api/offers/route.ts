import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createOffer, listOffers } from "@/lib/services/offers";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

async function requireAdmin() {
  const me = await getCurrentUser();
  return me && me.email.toLowerCase() === ADMIN_EMAIL ? me : null;
}

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse one or many recipient emails from a string ("a@x.com, b@y.com") or array. */
function parseEmails(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.join(",") : String(input ?? "");
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((e) => EMAIL_RE.test(e)),
    ),
  ].slice(0, 20);
}

/** Agent creates an offer (2–3 hotels + dates + a personal note). */
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (await rateLimitExceeded(req, "offers", 30, 60)) {
    return NextResponse.json({ error: "Too many — one moment." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const hotelIds = Array.isArray(body.hotelIds)
    ? body.hotelIds.map((x: unknown) => clean(x, 80)).filter(Boolean).slice(0, 3)
    : [];
  const city = clean(body.city, 80);
  const checkIn = clean(body.checkIn, 10);
  const checkOut = clean(body.checkOut, 10);
  if (hotelIds.length < 2) {
    return NextResponse.json({ error: "Pick at least 2 hotels to compare." }, { status: 400 });
  }
  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "Choose check-in and check-out dates." }, { status: 400 });
  }
  const offer = await createOffer({
    agentEmail: me.email,
    agentName: me.name || undefined,
    guestName: clean(body.guestName, 80) || undefined,
    guestEmails: parseEmails(body.guestEmails ?? body.guestEmail),
    city,
    checkIn,
    checkOut,
    guests: Number(body.guests) || undefined,
    note: clean(body.note, 800) || undefined,
    hotelIds,
  });
  return NextResponse.json({ offer });
}

/** Agent's list of offers (Sent / Viewed status). */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const offers = await listOffers();
  return NextResponse.json({ offers });
}
