import webpush from "web-push";
import { redisConfigured, redisCommand } from "@/lib/data/redis-store";

/**
 * Web Push (RFC 8291) so the team is pinged on their phone / desktop even with
 * no browser tab open. Active only when VAPID keys are set; otherwise a graceful
 * no-op. Subscriptions are stored in Redis (a set) with an in-memory fallback
 * shared across route modules via globalThis — mirrors the conversation log.
 *
 * Generate keys once with:  npx web-push generate-vapid-keys
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain).
 */
const PUB = process.env.VAPID_PUBLIC_KEY || "";
const PRIV = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@lorrainetravel.com";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady || !PUB || !PRIV) return;
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);
  vapidReady = true;
}

export function pushConfigured(): boolean {
  return Boolean(PUB && PRIV);
}
export function vapidPublicKey(): string {
  return PUB;
}

const KEY = "push:subs"; // Redis SET of JSON-encoded subscriptions
const globalForPush = globalThis as unknown as { __wahPushSubs?: Set<string> };
const mem = globalForPush.__wahPushSubs ?? (globalForPush.__wahPushSubs = new Set<string>());

type Sub = webpush.PushSubscription;

async function allSubs(): Promise<string[]> {
  if (redisConfigured()) {
    try {
      const all = await redisCommand<string[]>(["SMEMBERS", KEY]);
      if (all) return all;
    } catch {
      /* fall back to memory */
    }
  }
  return [...mem];
}

export async function savePushSubscription(sub: Sub): Promise<void> {
  const json = JSON.stringify(sub);
  mem.add(json);
  if (redisConfigured()) {
    try {
      await redisCommand(["SADD", KEY, json]);
    } catch {
      /* keep the in-memory copy */
    }
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  for (const j of [...mem]) if (j.includes(endpoint)) mem.delete(j);
  if (redisConfigured()) {
    try {
      const all = (await redisCommand<string[]>(["SMEMBERS", KEY])) ?? [];
      for (const j of all) if (j.includes(endpoint)) await redisCommand(["SREM", KEY, j]);
    } catch {
      /* ignore */
    }
  }
}

/** Broadcast a push to every stored subscription. Prunes expired ones. */
export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<void> {
  if (!pushConfigured()) return;
  ensureVapid();
  const subs = await allSubs();
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (j) => {
      let sub: Sub;
      try {
        sub = JSON.parse(j) as Sub;
      } catch {
        return;
      }
      try {
        await webpush.sendNotification(sub, data);
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await removePushSubscription(sub.endpoint);
      }
    }),
  );
}
