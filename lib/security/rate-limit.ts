import { redisConfigured, redisCommand } from "@/lib/data/redis-store";

/**
 * Per-IP fixed-window rate limiting, backed by the same Redis (Vercel KV /
 * Upstash) the rest of the app uses — no extra dependency.
 *
 * Design choices that keep real users safe:
 *  • No-op when Redis isn't configured (keyless/local dev keeps working).
 *  • Fails OPEN on any Redis error — a backend hiccup never blocks a real user.
 *  • Fixed window via INCR + EXPIRE (one counter per ip+bucket per window).
 *
 * Its job is to stop abusive loops (LLM cost amplification, credential
 * stuffing), not to be a precise quota system.
 */

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Returns true when this request is OVER the limit and should be blocked.
 * `bucket` scopes the counter (e.g. "chat", "login") so limits don't bleed
 * across endpoints.
 */
export async function rateLimitExceeded(
  req: Request,
  bucket: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  if (!redisConfigured()) return false; // no backend → don't limit
  try {
    const key = `rl:${bucket}:${clientIp(req)}`;
    const n = await redisCommand<number>(["INCR", key]);
    if (n === 1) await redisCommand(["EXPIRE", key, windowSec]);
    return n > limit;
  } catch {
    return false; // fail open
  }
}

/** Plain-text 429 for streaming / text endpoints (chat advisors). */
export function tooManyText(windowSec: number): Response {
  return new Response("You're going a little fast — give me a moment and try again.", {
    status: 429,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": String(windowSec) },
  });
}
