"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Headset, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConvMessage {
  role: "user" | "assistant" | "agent";
  content: string;
  ts: number;
}
interface Conversation {
  sessionId: string;
  name?: string;
  email?: string;
  city?: string;
  messages: ConvMessage[];
  mode: "ai" | "agent";
  needsAgent: boolean;
  updatedAt: number;
}

const rel = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export function ConversationsView() {
  const [list, setList] = useState<Conversation[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [sel, setSel] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll the list.
  useEffect(() => {
    let active = true;
    const load = async () => {
      const d = await fetch("/api/conversations").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (active && d?.conversations) {
        setList(d.conversations);
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 6000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  // Poll the selected conversation.
  useEffect(() => {
    if (!selId) {
      setSel(null);
      return;
    }
    let active = true;
    const load = async () => {
      const d = await fetch(`/api/conversations?id=${encodeURIComponent(selId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (active && d?.conversation) setSel(d.conversation);
    };
    load();
    const iv = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [selId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [sel?.messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !selId || sending) return;
    setSending(true);
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selId, content: text }),
      });
      setReply("");
      const d = await fetch(`/api/conversations?id=${encodeURIComponent(selId)}`).then((r) => r.json());
      if (d?.conversation) setSel(d.conversation);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const who = (c: Conversation) => c.name || c.email || "Guest";
  const lastMsg = (c: Conversation) => c.messages[c.messages.length - 1]?.content ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
      <p className="mt-1 text-sm text-[#717171]">
        Read what leads discussed with the AI, and take over live when someone asks for a human.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* List */}
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-[#EBEBEB] bg-white">
          {loading ? (
            <div className="grid h-40 place-items-center text-[#9a9a9a]"><Loader2 className="size-5 animate-spin" /></div>
          ) : list.length === 0 ? (
            <p className="p-6 text-sm text-[#717171]">No conversations yet.</p>
          ) : (
            list.map((c) => (
              <button
                key={c.sessionId}
                onClick={() => setSelId(c.sessionId)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-[#F2F2F2] px-4 py-3 text-left last:border-0 transition-colors",
                  selId === c.sessionId ? "bg-[#FF385C]/[0.06]" : "hover:bg-[#f7f7f7]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#1a1a1a]">{who(c)}</span>
                  {c.needsAgent ? (
                    <span className="shrink-0 rounded-full bg-[#FF385C] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Needs agent
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-[#9a9a9a]">{rel(c.updatedAt)}</span>
                  )}
                </div>
                <span className="truncate text-xs text-[#717171]">{lastMsg(c) || c.city || "—"}</span>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="flex max-h-[70vh] flex-col rounded-2xl border border-[#EBEBEB] bg-white">
          {!sel ? (
            <div className="grid flex-1 place-items-center p-10 text-center text-sm text-[#9a9a9a]">
              <div>
                <MessageSquare className="mx-auto mb-2 size-6" />
                Select a conversation to read it or reply.
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-[#EBEBEB] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1a1a1a]">{who(sel)}</p>
                  <p className="truncate text-xs text-[#717171]">
                    {sel.email || "no email"}{sel.city ? ` · ${sel.city}` : ""}
                  </p>
                </div>
                {sel.needsAgent && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FF385C]/10 px-2.5 py-1 text-xs font-semibold text-[#FF385C]">
                    <Headset className="size-3.5" /> Waiting for you
                  </span>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {sel.messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#1c1c1e] px-3.5 py-2 text-sm text-white">{m.content}</div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-start">
                      <div
                        className={cn(
                          "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md px-3.5 py-2 text-sm",
                          m.role === "agent" ? "bg-[#FF385C]/10 text-[#1a1a1a]" : "bg-black/[0.04] text-[#2a2a2a]",
                        )}
                      >
                        {m.role === "agent" && <span className="mb-0.5 block text-[10px] font-bold uppercase text-[#FF385C]">You (agent)</span>}
                        {m.content}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 border-t border-[#EBEBEB] p-3">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as a human advisor…"
                  className="flex-1 rounded-xl border border-[#DDDDDD] px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FF385C] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
