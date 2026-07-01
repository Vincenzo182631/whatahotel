import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { emailService } from "@/lib/integrations";

export const runtime = "nodejs";

/**
 * Request a password reset. Always returns success (no account enumeration).
 * With no email provider configured, the reset link is returned in the response
 * (dev) — in production the `emailService` adapter delivers it instead.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const user = await store.getUserByEmail(email);

  if (!user) return NextResponse.json({ ok: true });

  const token = randomUUID();
  await store.createResetToken({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(), // 1 hour
  });

  const link = `/reset/confirm?token=${token}`;
  const delivered = await emailService.sendPasswordReset(user.email, link);

  // Only surface the link when the email adapter is a no-op (dev convenience).
  return NextResponse.json({ ok: true, devResetLink: delivered ? undefined : link });
}
