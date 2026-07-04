import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import type { Lead, User } from "@/lib/data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

/**
 * Google OAuth callback: exchanges the code for the user's profile, records the
 * lead, signs them in, and returns to the app. Only active when the Google
 * credentials are configured.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const home = new URL("/", url.origin);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    home.searchParams.set("google", "unconfigured");
    return NextResponse.redirect(home);
  }
  const code = url.searchParams.get("code");
  if (!code) {
    home.searchParams.set("google", "error");
    return NextResponse.redirect(home);
  }

  try {
    // 1) Exchange the code for tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: `${url.origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error("no token");

    // 2) Fetch the profile.
    const profRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const prof = (await profRes.json()) as {
      email?: string;
      given_name?: string;
      family_name?: string;
      name?: string;
    };
    const email = (prof.email || "").trim().toLowerCase();
    if (!email) throw new Error("no email");
    const firstName = prof.given_name || (prof.name || "").split(" ")[0] || "";
    const lastName = prof.family_name || (prof.name || "").split(" ").slice(1).join(" ") || "";

    // 3) Record the lead + find/create the account.
    const lead: Lead = {
      id: randomUUID(),
      firstName,
      lastName,
      email,
      source: "google",
      createdAt: new Date().toISOString(),
    };
    await store.addLead(lead).catch(() => {});

    let user = await store.getUserByEmail(email);
    if (!user) {
      const newUser: User = {
        id: randomUUID(),
        email,
        name: [firstName, lastName].filter(Boolean).join(" ") || email,
        passwordHash: hashPassword(randomUUID()),
        membership: "free",
        subscription: { plan: "free", status: "none", since: null, renewsAt: null, billing: [] },
        profile: {},
        createdAt: new Date().toISOString(),
      };
      user = await store.createUser(newUser);
    }

    const token = await signSession({ sub: user.id, email: user.email, name: user.name });
    home.searchParams.set("welcome", "1");
    const res = NextResponse.redirect(home);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    home.searchParams.set("google", "error");
    return NextResponse.redirect(home);
  }
}
