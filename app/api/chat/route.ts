import { runTurn } from "@/lib/ai/advisor";
import { streamReply } from "@/lib/ai/provider";
import type { ChatRequestBody } from "@/lib/chat/types";

// In-memory session storage requires the Node runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A live comparison fans out to several sequential WhataHotel API calls.
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  if (!body?.sessionId || !Array.isArray(body.messages)) {
    return new Response("Missing sessionId or messages", { status: 400 });
  }

  const { ctx, payload } = await runTurn(body);

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
