import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import { toPublicUser, type UserProfile } from "@/lib/data/types";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : user.name;

  const profile: UserProfile = { ...user.profile };
  for (const k of ["phone", "city", "country", "bio"] as const) {
    if (typeof body[k] === "string") profile[k] = body[k];
  }
  if (["solo", "couple", "family", "business"].includes(body.travelerType)) {
    profile.travelerType = body.travelerType;
  }

  const updated = await store.updateUser(user.id, { name, profile });
  return NextResponse.json({ user: updated ? toPublicUser(updated) : null });
}
