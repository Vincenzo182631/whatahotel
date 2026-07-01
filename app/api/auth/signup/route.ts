import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/accounts";
import { signSession } from "@/lib/auth/jwt";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { toPublicUser } from "@/lib/data/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await registerUser({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const token = await signSession({
    sub: result.user.id,
    email: result.user.email,
    name: result.user.name,
  });
  const res = NextResponse.json({ user: toPublicUser(result.user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
