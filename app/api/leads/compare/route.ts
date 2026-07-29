import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/auth/session";
import type { LeadComparison } from "@/lib/data/types";
import { rateLimitExceeded } from "@/lib/security/rate-limit";
import { ANON_VID_COOKIE, anonCookieOptions, attachAnonComparisons } from "@/lib/leads/anon-comparisons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();
const clean = (v: unknown, max = 80) => String(v ?? "").trim().slice(0, max);

/**
 * Record a comparison opened on /compare so the advisor can see — and click
 * straight into — exactly what someone was weighing. Fire-and-forget from the
 * compare page. Signed-in leads get it on their CRM record immediately; guests
 * get it stashed against an anonymous browser id and folded onto their lead the
 * moment they sign up. The advisor's own comparisons are never tracked.
 */
export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "lead-compare", 60, 60)) {
    return NextResponse.json({ ok: false });
  }
  const user = await getCurrentUser().catch(() => null);
  if (user && user.email.toLowerCase() === ADMIN_EMAIL) {
    return NextResponse.json({ ok: false }); // never track the advisor's curation
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

  const jar = await cookies();
  const vid = jar.get(ANON_VID_COOKIE)?.value;

  if (user) {
    // Signed-in lead: record now, and fold in anything compared before they
    // signed in on this browser.
    await store.addLeadComparison(user.email, comparison).catch(() => {});
    if (vid) await attachAnonComparisons(vid, user.email);
    return NextResponse.json({ ok: true });
  }

  // Guest: stash under an anonymous browser id (create one if needed).
  const anonId = vid || randomUUID();
  await store.addAnonComparison(anonId, comparison).catch(() => {});
  const res = NextResponse.json({ ok: true, anonymous: true });
  if (!vid) res.cookies.set(ANON_VID_COOKIE, anonId, anonCookieOptions());
  return res;
}
