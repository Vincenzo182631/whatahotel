import { getCurrentUser } from "@/lib/auth/session";
import { logTranscript } from "@/lib/services/conversation-log";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Persist the current chat transcript for the CRM (fire-and-forget from the client). */
export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "chat-log", 60, 60)) return Response.json({ ok: false });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId ?? "");
  const messages: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
  if (!sessionId || messages.length === 0) return Response.json({ ok: false });

  const user = await getCurrentUser().catch(() => null);
  await logTranscript(sessionId, messages.slice(-60), {
    name: user?.name,
    email: user?.email,
    city: body.city ? String(body.city).slice(0, 80) : undefined,
  }).catch(() => {});
  return Response.json({ ok: true });
}
