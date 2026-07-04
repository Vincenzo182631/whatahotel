import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { sessionCookieOptions, SESSION_COOKIE, getCurrentUser } from "@/lib/auth/session";
import { toPublicUser, type Lead, type User } from "@/lib/data/types";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Capture a lead (name + email) at the chat sign-up gate, record it for the CRM,
 * and sign them in via a lightweight passwordless account so they can keep
 * chatting/comparing. They can set a password later to unlock full account login.
 */
export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "leads", 10, 60)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = String(body.firstName ?? "").trim().slice(0, 60);
  const lastName = String(body.lastName ?? "").trim().slice(0, 60);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!firstName || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter your first name and a valid email." },
      { status: 400 },
    );
  }
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const source: Lead["source"] = body.source === "google" ? "google" : "chat-gate";

  // 1) Record the lead (CRM).
  const lead: Lead = {
    id: randomUUID(),
    firstName,
    lastName,
    email,
    source,
    city: body.city ? String(body.city).slice(0, 80) : undefined,
    checkIn: body.checkIn ? String(body.checkIn).slice(0, 10) : undefined,
    checkOut: body.checkOut ? String(body.checkOut).slice(0, 10) : undefined,
    exchanges: Number(body.exchanges) || undefined,
    createdAt: new Date().toISOString(),
  };
  await store.addLead(lead).catch(() => {});

  // 2) Find or create a passwordless account so they're recognised + signed in.
  let user = await store.getUserByEmail(email);
  if (!user) {
    const newUser: User = {
      id: randomUUID(),
      email,
      name,
      passwordHash: hashPassword(randomUUID()), // random → cannot password-login until they set one
      membership: "free",
      subscription: { plan: "free", status: "none", since: null, renewsAt: null, billing: [] },
      profile: {},
      createdAt: new Date().toISOString(),
    };
    user = await store.createUser(newUser);
  }

  const token = await signSession({ sub: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

/** Owner-only: the captured leads (CRM). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const leads = await store.listLeads();
  return NextResponse.json({ leads });
}
