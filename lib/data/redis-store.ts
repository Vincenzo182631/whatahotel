import type { DataStore } from "./store";
import type { PasswordResetToken, Trip, User } from "./types";

/**
 * Durable data store backed by Upstash Redis over its REST API — no driver, no
 * npm package, just fetch. Works with Vercel KV (which injects KV_REST_API_*)
 * and standalone Upstash (UPSTASH_REDIS_REST_*). Selected automatically by
 * `store.ts` whenever the env vars are present.
 *
 * Keys:
 *   user:<id>          -> User JSON
 *   useremail:<email>  -> user id
 *   trips:<userId>     -> Trip[] JSON
 *   reset:<token>      -> PasswordResetToken JSON (TTL 1h)
 */

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function redisConfigured(): boolean {
  return Boolean(URL && TOKEN);
}

/** Which env var pair supplied the config (for diagnostics; never the token). */
export function redisSource(): string | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return "vercel-kv";
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    return "upstash";
  return null;
}

/** Round-trips a health key to confirm the connection actually works. */
export async function redisPing(): Promise<{ ok: boolean; error?: string }> {
  if (!redisConfigured()) return { ok: false, error: "not configured" };
  try {
    await redis(["SET", "health:ping", "1"]);
    const v = await redis<string | null>(["GET", "health:ping"]);
    await redis(["DEL", "health:ping"]);
    return { ok: v === "1" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function redis<T = unknown>(command: (string | number)[]): Promise<T> {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result as T;
}

const norm = (email: string) => email.trim().toLowerCase();

async function getJson<T>(key: string): Promise<T | null> {
  const v = await redis<string | null>(["GET", key]);
  return v ? (JSON.parse(v) as T) : null;
}

export class RedisStore implements DataStore {
  async getUserByEmail(email: string) {
    const id = await redis<string | null>(["GET", `useremail:${norm(email)}`]);
    return id ? this.getUserById(id) : null;
  }

  async getUserById(id: string) {
    return getJson<User>(`user:${id}`);
  }

  async createUser(user: User) {
    user.email = norm(user.email);
    await redis(["SET", `user:${user.id}`, JSON.stringify(user)]);
    await redis(["SET", `useremail:${user.email}`, user.id]);
    return user;
  }

  async updateUser(id: string, patch: Partial<User>) {
    const current = await this.getUserById(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    await redis(["SET", `user:${id}`, JSON.stringify(next)]);
    if (patch.email) await redis(["SET", `useremail:${norm(next.email)}`, id]);
    return next;
  }

  async listTrips(userId: string) {
    const trips = (await getJson<Trip[]>(`trips:${userId}`)) ?? [];
    return trips.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }

  async addTrip(trip: Trip) {
    const trips = (await getJson<Trip[]>(`trips:${trip.userId}`)) ?? [];
    trips.push(trip);
    await redis(["SET", `trips:${trip.userId}`, JSON.stringify(trips)]);
    return trip;
  }

  async createResetToken(token: PasswordResetToken) {
    await redis(["SET", `reset:${token.token}`, JSON.stringify(token), "EX", 3600]);
  }

  async consumeResetToken(token: string) {
    const record = await getJson<PasswordResetToken>(`reset:${token}`);
    if (!record) return null;
    await redis(["DEL", `reset:${token}`]);
    if (new Date(record.expiresAt).getTime() < Date.now()) return null;
    return record;
  }
}
