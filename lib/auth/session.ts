import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySession, type SessionClaims } from "./jwt";
import { store } from "@/lib/data/store";
import { toPublicUser, type PublicUser, type User } from "@/lib/data/types";

/** Read + verify the session cookie (server components & route handlers). */
export async function getSessionClaims(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Full current user record, or null if not signed in. */
export async function getCurrentUser(): Promise<User | null> {
  const claims = await getSessionClaims();
  if (!claims) return null;
  return store.getUserById(claims.sub);
}

/** Current user, safe for returning to the client. */
export async function getCurrentPublicUser(): Promise<PublicUser | null> {
  const u = await getCurrentUser();
  return u ? toPublicUser(u) : null;
}

/** Cookie options shared by login/signup/logout. */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export { SESSION_COOKIE };
