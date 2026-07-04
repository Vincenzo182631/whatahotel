import { getCurrentUser } from "@/lib/auth/session";
import { listConversations, getConversation, postMessage } from "@/lib/services/conversation-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

async function requireAdmin(): Promise<boolean> {
  const me = await getCurrentUser().catch(() => null);
  return Boolean(me && me.email.toLowerCase() === ADMIN_EMAIL);
}

/** Admin: list conversations, or one (?id=), for the CRM + live-agent view. */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Not authorized" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const conversation = await getConversation(id);
    return Response.json({ conversation }, { headers: { "Cache-Control": "no-store" } });
  }
  const conversations = await listConversations();
  return Response.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
}

/** Admin: reply as the human agent (takes over the conversation). */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Not authorized" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId ?? "");
  const content = String(body.content ?? "").trim().slice(0, 2000);
  if (!sessionId || !content) return Response.json({ error: "missing" }, { status: 400 });
  const conv = await postMessage(sessionId, "agent", content);
  return Response.json({ ok: true, updatedAt: conv.updatedAt });
}
