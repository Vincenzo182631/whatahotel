import { randomUUID } from "node:crypto";
import { store } from "@/lib/data/store";
import { hashPassword } from "./password";
import type { Subscription, Trip, User } from "@/lib/data/types";
import { HOTELS } from "@/lib/services/mock-data";

function freeSubscription(): Subscription {
  return { plan: "free", status: "none", since: null, renewsAt: null, billing: [] };
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** A couple of realistic sample trips so "My Trips" is populated on day one. */
async function seedTrips(userId: string) {
  const picks = [HOTELS[0], HOTELS[Math.floor(HOTELS.length / 2)]].filter(Boolean);
  const specs: { hotel: (typeof HOTELS)[number]; ci: number; co: number; status: Trip["status"] }[] = [
    { hotel: picks[0], ci: -74, co: -70, status: "past" },
    { hotel: picks[1], ci: 38, co: 42, status: "upcoming" },
  ];
  for (const s of specs) {
    if (!s.hotel) continue;
    const nights = Math.round((s.co - s.ci) / 1) || 4;
    await store.addTrip({
      id: randomUUID(),
      userId,
      hotelId: s.hotel.id,
      hotelName: s.hotel.name,
      city: s.hotel.city,
      country: s.hotel.country,
      image: s.hotel.image,
      checkIn: daysFromNow(s.ci),
      checkOut: daysFromNow(s.co),
      status: s.status,
      nights,
      total: s.hotel.startingRate * nights,
      currency: "USD",
      confirmation: "WH-" + randomUUID().slice(0, 8).toUpperCase(),
    });
  }
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export type RegisterResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { ok: false, error: "Please enter a valid email address." };
  if (input.password.length < 8)
    return { ok: false, error: "Password must be at least 8 characters." };

  const existing = await store.getUserByEmail(email);
  if (existing) return { ok: false, error: "An account with this email already exists." };

  const user: User = {
    id: randomUUID(),
    email,
    name,
    passwordHash: hashPassword(input.password),
    membership: "free",
    subscription: freeSubscription(),
    profile: {},
    createdAt: new Date().toISOString(),
  };
  await store.createUser(user);
  await seedTrips(user.id);
  return { ok: true, user };
}
