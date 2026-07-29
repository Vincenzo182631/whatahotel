import { store } from "@/lib/data/store";

/** Cookie holding an anonymous browser id, used to stash comparisons made before
 *  the visitor signs up. HttpOnly so client JS can't read it. */
export const ANON_VID_COOKIE = "wah_vid";

export function anonCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Move any comparisons stashed against this browser id onto the lead identified
 * by `email` (called right after a lead is created at sign-up / chat-gate).
 * Oldest-first so successive prepends leave the list newest-first.
 */
export async function attachAnonComparisons(
  vid: string | undefined,
  email: string,
): Promise<void> {
  if (!vid) return;
  const stashed = await store.takeAnonComparisons(vid).catch(() => []);
  for (const c of [...stashed].reverse()) {
    await store.addLeadComparison(email, c).catch(() => null);
  }
}
