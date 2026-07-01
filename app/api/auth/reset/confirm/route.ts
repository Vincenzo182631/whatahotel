import { NextResponse } from "next/server";
import { store } from "@/lib/data/store";
import { hashPassword } from "@/lib/auth/password";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (password.length < 8)
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );

  const record = await store.consumeResetToken(token);
  if (!record)
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );

  await store.updateUser(record.userId, { passwordHash: hashPassword(password) });
  return NextResponse.json({ ok: true });
}
