import { redisConfigured, redisCommand } from "@/lib/data/redis-store";

/**
 * Durable conversation log for the CRM — the transcript of each visitor's chat,
 * so the admin can read what leads discussed, and a human agent can take over
 * ("worst case, tap a live agent"). Backed by Redis (Vercel KV) with an in-memory
 * fallback. Real-time is done with short-polling (no WebSockets on Vercel).
 */

export interface ConvMessage {
  role: "user" | "assistant" | "agent";
  content: string;
  ts: number;
}

export interface Conversation {
  sessionId: string;
  name?: string;
  email?: string;
  city?: string;
  messages: ConvMessage[];
  mode: "ai" | "agent";
  needsAgent: boolean;
  createdAt: number;
  updatedAt: number;
}

const KEY = (id: string) => `conv:${id}`;
const INDEX = "conv:index";
const TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_MESSAGES = 200;
const useRedis = redisConfigured();
// A process-global map so the in-memory fallback is shared across route modules
// (dev / a single warm serverless instance) — mirrors the session store.
const globalForConv = globalThis as unknown as { __wahConvLog?: Map<string, Conversation> };
const mem = globalForConv.__wahConvLog ?? (globalForConv.__wahConvLog = new Map<string, Conversation>());

async function load(id: string): Promise<Conversation | null> {
  if (useRedis) {
    try {
      const raw = await redisCommand<string | null>(["GET", KEY(id)]);
      if (raw) return JSON.parse(raw) as Conversation;
    } catch {
      /* fall back to memory */
    }
  }
  return mem.get(id) ?? null;
}

async function save(conv: Conversation): Promise<Conversation> {
  conv.updatedAt = Date.now();
  if (conv.messages.length > MAX_MESSAGES) conv.messages = conv.messages.slice(-MAX_MESSAGES);
  mem.set(conv.sessionId, conv);
  if (useRedis) {
    try {
      await redisCommand(["SET", KEY(conv.sessionId), JSON.stringify(conv), "EX", TTL]);
      await redisCommand(["ZADD", INDEX, conv.updatedAt, conv.sessionId]);
    } catch {
      /* keep the in-memory copy */
    }
  }
  return conv;
}

function fresh(id: string): Conversation {
  const now = Date.now();
  return { sessionId: id, messages: [], mode: "ai", needsAgent: false, createdAt: now, updatedAt: now };
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return load(id);
}

/** Store the AI transcript from the client (only while the AI is in control). */
export async function logTranscript(
  id: string,
  msgs: { role: string; content: string }[],
  meta: { name?: string; email?: string; city?: string },
): Promise<void> {
  const conv = (await load(id)) ?? fresh(id);
  if (meta.name) conv.name = meta.name;
  if (meta.email) conv.email = meta.email;
  if (meta.city) conv.city = meta.city;
  // Once a human is engaged (agent mode), the agent endpoints own the messages;
  // don't overwrite them with the client's AI transcript.
  if (conv.mode !== "agent") {
    conv.messages = msgs
      .filter((m) => m.content?.trim())
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content, ts: conv.createdAt }));
  }
  await save(conv);
}

/** Visitor asks for a human — flag it and pause the AI. */
export async function requestAgent(id: string): Promise<Conversation> {
  const conv = (await load(id)) ?? fresh(id);
  conv.needsAgent = true;
  conv.mode = "agent";
  conv.messages.push({
    role: "assistant",
    content:
      "You've asked to speak with a human advisor — I've flagged this conversation. A member of our team will reply right here shortly. You can keep typing in the meantime.",
    ts: Date.now(),
  });
  return save(conv);
}

/** Append a message from the visitor (agent mode) or the human agent. */
export async function postMessage(
  id: string,
  role: "user" | "agent",
  content: string,
): Promise<Conversation> {
  const conv = (await load(id)) ?? fresh(id);
  conv.mode = "agent";
  if (role === "agent") conv.needsAgent = false; // a human is now engaged
  conv.messages.push({ role, content, ts: Date.now() });
  return save(conv);
}

/** Poll for messages newer than `since` + the current mode. */
export async function pollSince(
  id: string,
  since: number,
): Promise<{ mode: "ai" | "agent"; needsAgent: boolean; messages: ConvMessage[] }> {
  const conv = await load(id);
  if (!conv) return { mode: "ai", needsAgent: false, messages: [] };
  return { mode: conv.mode, needsAgent: conv.needsAgent, messages: conv.messages.filter((m) => m.ts > since) };
}

/** Admin: most-recently-active conversations. */
export async function listConversations(limit = 100): Promise<Conversation[]> {
  if (useRedis) {
    try {
      const ids = (await redisCommand<string[]>(["ZREVRANGE", INDEX, 0, limit - 1])) ?? [];
      const out: Conversation[] = [];
      for (const id of ids) {
        const c = await load(id);
        if (c) out.push(c);
      }
      return out;
    } catch {
      /* fall back to memory */
    }
  }
  return [...mem.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}
