/**
 * Core persisted domain types. Kept free of any storage-specific detail so the
 * same models work whether backed by the bundled file store or a future
 * Postgres/Supabase adapter.
 */

export type MembershipTier = "free" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "none";

export interface BillingEntry {
  id: string;
  date: string; // ISO
  description: string;
  amount: number; // USD
  status: "paid" | "refunded" | "pending";
}

export interface Subscription {
  plan: MembershipTier;
  status: SubscriptionStatus;
  since: string | null; // ISO — when the current plan started
  renewsAt: string | null; // ISO — next renewal / billing date
  billing: BillingEntry[];
}

export interface UserProfile {
  phone?: string;
  city?: string;
  country?: string;
  bio?: string;
  travelerType?: "solo" | "couple" | "family" | "business";
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // scrypt: salt:hash
  membership: MembershipTier;
  subscription: Subscription;
  profile: UserProfile;
  /** Durable traveller preferences, synced from the chatbots across devices. */
  memory?: string[];
  createdAt: string; // ISO
}

/** User with secrets stripped — safe to return to the client. */
export type PublicUser = Omit<User, "passwordHash">;

export interface Trip {
  id: string;
  userId: string;
  hotelId: string;
  hotelName: string;
  city: string;
  country: string;
  image: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  status: "past" | "upcoming";
  nights: number;
  total: number; // USD
  currency: string;
  confirmation: string;
  /** Room booked (live bookings) + where its detail page lives. */
  roomName?: string;
  detailPath?: string; // e.g. /stay/1089 for live hotels; defaults to /hotel/<id>
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: string; // ISO
}

export function toPublicUser(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = u;
  return rest;
}
