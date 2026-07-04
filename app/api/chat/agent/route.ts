import { requestAgent, postMessage, pollSince } from "@/lib/services/conversation-log";
import { rateLimitExceeded } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Visitor side of the live-agent handoff.
 * POST { sessionId, action: "request" | "message", content? } — ask for a human, or
 *   send a message while a human is handling the chat.
 * GET  ?sessionId&since=<ts> — poll for new agent messages + the current mode.
 */
export async function POST(req: Request) {
  if (await rateLimitExceeded(req, "chat-agent", 40, 60)) {
    return Response.json({ error: "Too fast — one moment." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId ?? "");
  if (!sessionId) return Response.json({ error: "missing session" }, { status: 400 });

  if (body.action === "request") {
    const conv = await requestAgent(sessionId);
    return Response.json({ mode: conv.mode, needsAgent: conv.needsAgent });
  }
  if (body.action === "message") {
    const content = String(body.content ?? "").trim().slice(0, 2000);
    if (!content) return Response.json({ error: "empty" }, { status: 400 });
    const conv = await postMessage(sessionId, "user", content);
    return Response.json({ mode: conv.mode });
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const since = Number(searchParams.get("since")) || 0;
  if (!sessionId) return Response.json({ mode: "ai", needsAgent: false, messages: [] });
  const res = await pollSince(sessionId, since);
  return Response.json(res, { headers: { "Cache-Control": "no-store" } });
}
