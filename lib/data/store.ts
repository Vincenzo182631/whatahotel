import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PasswordResetToken, Trip, User } from "./types";
import { RedisStore, redisConfigured } from "./redis-store";

/**
 * Data store abstraction.
 *
 * The whole app talks to this interface, never to a concrete database. The
 * bundled implementation persists to a JSON file (local dev + a warm serverless
 * instance). To go multi-user durable, implement `DataStore` against Postgres /
 * Supabase / Prisma and swap the `store` export below — nothing else changes.
 */
export interface DataStore {
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;

  listTrips(userId: string): Promise<Trip[]>;
  addTrip(trip: Trip): Promise<Trip>;

  createResetToken(token: PasswordResetToken): Promise<void>;
  consumeResetToken(token: string): Promise<PasswordResetToken | null>;
}

interface Db {
  users: User[];
  trips: Trip[];
  resets: PasswordResetToken[];
}

const DATA_DIR =
  process.env.DATA_DIR || path.join(os.tmpdir(), "whatahotel-data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function load(): Db {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { users: [], trips: [], resets: [] };
  }
}

function save(db: Db) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch {
    /* read-only FS — keep working from memory this instance */
  }
}

// Keep a hot copy in memory so reads are fast and writes are atomic-ish.
let cache: Db | null = null;
function db(): Db {
  if (!cache) cache = load();
  return cache;
}

const norm = (email: string) => email.trim().toLowerCase();

class FileStore implements DataStore {
  async getUserByEmail(email: string) {
    return db().users.find((u) => u.email === norm(email)) ?? null;
  }
  async getUserById(id: string) {
    return db().users.find((u) => u.id === id) ?? null;
  }
  async createUser(user: User) {
    user.email = norm(user.email);
    db().users.push(user);
    save(db());
    return user;
  }
  async updateUser(id: string, patch: Partial<User>) {
    const u = db().users.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, patch);
    save(db());
    return u;
  }
  async listTrips(userId: string) {
    return db()
      .trips.filter((t) => t.userId === userId)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }
  async addTrip(trip: Trip) {
    db().trips.push(trip);
    save(db());
    return trip;
  }
  async createResetToken(token: PasswordResetToken) {
    db().resets.push(token);
    save(db());
  }
  async consumeResetToken(token: string) {
    const idx = db().resets.findIndex((r) => r.token === token);
    if (idx === -1) return null;
    const [t] = db().resets.splice(idx, 1);
    save(db());
    if (new Date(t.expiresAt).getTime() < Date.now()) return null;
    return t;
  }
}

// Prefer a durable Redis store (Vercel KV / Upstash) when configured; otherwise
// fall back to the bundled file store. No code changes needed to switch — just
// set the KV_REST_API_* (or UPSTASH_REDIS_REST_*) env vars.
export const store: DataStore = redisConfigured() ? new RedisStore() : new FileStore();

