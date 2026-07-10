import { runTurn } from "@/lib/ai/advisor";
import { streamReply } from "@/lib/ai/provider";
import { rateLimitExceeded, tooManyText } from "@/lib/security/rate-limit";
import { attachBeachIntelligence } from "@/lib/ai/beach";
import { beachAlertFrom } from "@/lib/services/beach-intelligence";
import type { ChatRequestBody } from "@/lib/chat/types";

// In-memory session storage requires the Node runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A live comparison fans out to several sequential WhataHotel API calls.
export const maxDuration = 30;

export async function POST(req: Request) {
  // Rate limit: this endpoint fans out to the LLM, so cap per-IP request rate to
  // stop a script from running up the AI bill.
  if (await rateLimitExceeded(req, "chat", 30, 60)) return tooManyText(60);

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  if (!body?.sessionId || !Array.isArray(body.messages)) {
    return new Response("Missing sessionId or messages", { status: 400 });
  }
  // Cap payload size — a normal conversation is well under this.
  if (body.messages.length > 60) body.messages = body.messages.slice(-60);

  const { ctx, payload } = await runTurn(body);

  // Time-of-day + first-turn greeting cue (computed from the traveller's local
  // clock on the client), used only to open warmly and naturally.
  const tod = String(body.timeOfDay ?? "");
  ctx.timeOfDay = /^(morning|afternoon|evening|night)$/.test(tod) ? tod : undefined;
  ctx.greet = !body.messages.some((m) => m.role === "assistant");

  // Overlay current sargassum/beach conditions when the destination is coastal
  // or the traveller asked. No-op unless BEACH_INTELLIGENCE_URL is configured.
  await attachBeachIntelligence(ctx);
  // Surface a visible red warning when the mentioned destination has risky
  // sargassum conditions (score ≤ 60 or worsening) — rendered by the UI.
  if (ctx.beach) {
    const alert = beachAlertFrom(ctx.beach);
    if (alert) payload.beachAlert = alert;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const chunk of streamReply(ctx)) {
          send({ type: "text", value: chunk });
        }
        send({ type: "final", payload });
      } catch {
        send({
          type: "text",
          value:
            "My apologies — something interrupted me just now. Could you say that once more?",
        });
        send({ type: "final", payload });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
