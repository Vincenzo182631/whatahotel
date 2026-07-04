import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { toPublicUser } from "@/lib/data/types";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// A real hash to verify against when the email doesn't exist, so a missing
// account takes the same time as a wrong password (no timing enumeration).
const DUMMY_HASH = hashPassword("wah-login-timing-equalizer");

export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "login", 10, 60)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const user = await store.getUserByEmail(email);
  // Always run a hash comparison (dummy when the user is missing) so response
  // time doesn't reveal which emails have accounts.
  const ok = verifyPassword(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  const token = await signSession({ sub: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
