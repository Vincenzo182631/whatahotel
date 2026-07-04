import { getConversation, requestAgent, postMessage, pollSince } from "@/lib/services/conversation-log";
import { rateLimitExceeded } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/services/email";
import { sendPushToAll } from "@/lib/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

/** Notify the team by email the first time a guest asks for a human. Best-effort. */
async function alertAdmin(
  origin: string,
  conv: { sessionId: string; name?: string; email?: string; city?: string },
) {
  const who = conv.name || conv.email || "A guest";
  const about = conv.city ? ` about <strong>${conv.city}</strong>` : "";
  const link = `${origin}/dashboard/conversations`;
  await Promise.all([
    sendEmail({
      to: ADMIN_EMAIL,
      subject: "WhataHotel — a guest wants a live advisor",
      html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#1a1a1a">
        <p><strong>${who}</strong> just asked to speak with a human advisor${about}.</p>
        ${conv.email ? `<p style="color:#555">Reply-to: ${conv.email}</p>` : ""}
        <p><a href="${link}" style="display:inline-block;background:#FF385C;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open the conversation →</a></p>
        <p style="color:#888;font-size:13px">Or go to ${link}</p>
      </div>`,
      text: `${who} asked to speak with a human advisor${conv.city ? ` about ${conv.city}` : ""}. Open ${link}`,
    }).catch(() => {}),
    sendPushToAll({
      title: "A guest needs a live advisor",
      body: `${who} asked to speak with a human${conv.city ? ` about ${conv.city}` : ""}.`,
      url: link,
      tag: conv.sessionId,
    }).catch(() => {}),
  ]);
}

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
    const prev = await getConversation(sessionId);
    const wasFlagged = prev?.needsAgent === true;
    const conv = await requestAgent(sessionId);
    // Only email on the transition into "needs a human" — not on repeat taps.
    if (!wasFlagged) await alertAdmin(new URL(req.url).origin, conv);
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
