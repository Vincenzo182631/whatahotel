import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/auth/session";
import type { LeadComparison } from "@/lib/data/types";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();
const clean = (v: unknown, max = 80) => String(v ?? "").trim().slice(0, max);

/**
 * Record a comparison the current (signed-in) lead opened on /compare, so the
 * advisor can see — and click straight into — exactly what they were weighing.
 * Fire-and-forget from the compare page; no-op for guests and for the advisor.
 */
export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "lead-compare", 60, 60)) {
    return NextResponse.json({ ok: false });
  }
  const user = await getCurrentUser().catch(() => null);
  // Only track a real, signed-in lead — never the advisor's own comparisons.
  if (!user || user.email.toLowerCase() === ADMIN_EMAIL) {
    return NextResponse.json({ ok: false });
  }

  const body = await req.json().catch(() => ({}));
  const hotelIds = [clean(body.a), clean(body.b), clean(body.c)].filter(Boolean);
  if (hotelIds.length < 2) return NextResponse.json({ ok: false });

  const checkIn = clean(body.checkIn, 10);
  const checkOut = clean(body.checkOut, 10);
  const city = clean(body.city, 80) || undefined;

  const p = new URLSearchParams();
  const [a, b, c] = hotelIds;
  p.set("a", a);
  p.set("b", b);
  if (c) p.set("c", c);
  if (checkIn && checkOut) {
    p.set("checkIn", checkIn);
    p.set("checkOut", checkOut);
  }

  const comparison: LeadComparison = {
    path: `/compare?${p.toString()}`,
    hotelIds,
    city,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    at: new Date().toISOString(),
  };

  await store.addLeadComparison(user.email, comparison).catch(() => {});
  return NextResponse.json({ ok: true });
}
