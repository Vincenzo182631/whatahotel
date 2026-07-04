import { getCurrentUser } from "@/lib/auth/session";
import { store } from "@/lib/data/store";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NOTES = 24;

function merge(existing: string[], incoming: string[]): string[] {
  const out = [...existing];
  for (const n of incoming) {
    const clean = String(n).trim();
    if (clean && clean.length <= 120 && !out.some((m) => m.toLowerCase() === clean.toLowerCase())) out.push(clean);
  }
  return out.slice(-MAX_NOTES);
}

/** The signed-in guest's durable memory (empty when logged out). */
export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ notes: user?.memory ?? [] });
}

/** Merge the client's memory into the account so it follows them across devices. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ notes: [] }, { status: 401 });
  if (await rateLimitExceeded(req, "memory", 30, 60)) return Response.json({ notes: user.memory ?? [] });

  const body = await req.json().catch(() => ({}));
  const incoming: string[] = Array.isArray(body.notes) ? body.notes.map(String) : [];
  const merged = merge(user.memory ?? [], incoming);
  await store.updateUser(user.id, { memory: merged });
  return Response.json({ notes: merged });
}
