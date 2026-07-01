import { NextResponse } from "next/server";
import { getCurrentPublicUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentPublicUser();
  return NextResponse.json({ user });
}
