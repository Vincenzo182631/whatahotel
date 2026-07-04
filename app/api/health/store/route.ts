import { NextResponse } from "next/server";
import { redisConfigured, redisSource, redisPing } from "@/lib/data/redis-store";

export const runtime = "nodejs";

/**
 * Diagnostic: reports which data store is active and whether Redis actually
 * responds. Never returns tokens or secrets — booleans + provider name only.
 */
export async function GET() {
  const configured = redisConfigured();
  const ping = configured ? await redisPing() : { ok: false, error: "not configured" };
  return NextResponse.json({
    store: configured && ping.ok ? "redis" : "file",
    redisConfigured: configured,
    redisSource: redisSource(),
    redisOk: ping.ok,
    redisError: ping.error ?? null,
  });
}
