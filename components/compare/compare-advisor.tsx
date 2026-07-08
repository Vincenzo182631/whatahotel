"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Scale } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { useTravelerMemory } from "@/store/traveler-memory-store";
import { useSpeakReplies } from "@/lib/voice/use-speak-replies";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const PREFS: { key: string; label: string }[] = [
  { key: "honeymoon", label: "Honeymoon" },
  { key: "family", label: "Family" },
  { key: "business", label: "Business" },
  { key: "luxury", label: "Luxury" },
  { key: "value", label: "Best value" },
  { key: "adventure", label: "Adventure" },
];

/**
 * AI Travel Advisor for the side-by-side comparison. Auto-generates an
 * opinionated verdict (best pick + confidence + pros/cons) across the selected
 * hotels, re-weights it by trip type, and answers comparison questions —
 * grounded in each hotel's live data via /api/compare-chat.
 */
export function CompareAdvisor({
  hotels,
  checkIn,
  checkOut,
}: {
  hotels: { id: string; name: string }[];
  checkIn: string;
  checkOut: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [priority, setPriority] = useState<string>("");
  const memory = useTravelerMemory((s) => s.notes);
  const learn = useTravelerMemory((s) => s.learn);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Read the verdict + answers aloud when the guest has voice on.
  useSpeakReplies(messages);

  const ids = hotels.map((h) => h.id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-generate the opening verdict once.
  useEffect(() => {
    if (started.current || hotels.length < 2) return;
    started.current = true;
    run({ userLabel: null, priority: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(opts: { question?: string; userLabel?: string | null; priority: string }) {
    if (busy) return;
    const uid = Math.random().toString(36).slice(2);
    const aid = uid + "-a";
    const history = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));

    setBusy(true);
    setMessages((m) => [
      ...m,
      ...(opts.userLabel ? [{ id: uid, role: "user" as const, content: opts.userLabel }] : []),
      { id: aid, role: "assistant" as const, content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/compare-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          checkIn,
          checkOut,
          question: opts.question ?? "",
          priority: opts.priority,
          history,
          memory,
        }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: x.content + chunk } : x)));
      }
    } catch {
      setMessages((m) =>
        m.map((x) =>
          x.id === aid
            ? { ...x, content: x.content || "I couldn't reach the comparison advisor just now — please try again." }
            : x,
        ),
      );
    } finally {
      setBusy(false);
      setMessages((m) => m.map((x) => (x.id === aid ? { ...x, streaming: false } : x)));
    }
  }

  const pickPriority = (key: string, label: string) => {
    if (busy) return;
    setPriority(key);
    learn(label); // a chosen trip type is a durable preference
    run({ userLabel: `Best for ${label.toLowerCase()}?`, priority: key });
  };

  const ask = (question: string) => {
    if (busy || !question.trim()) return;
    learn(question);
    run({ question, userLabel: question, priority });
  };

  if (hotels.length < 2) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 py-3.5">
        <span className="grid size-8 place-items-center rounded-full bg-[#FF385C]/10 ring-1 ring-[#FF385C]/15">
          <Scale className="size-4 text-[#FF385C]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1a1a1a]">Comparison advisor</p>
          <p className="flex items-center gap-1 text-[11px] text-[#717171]">
            <Sparkles className="size-3 text-[#FF385C]" /> AI verdict across your {hotels.length} hotels
          </p>
        </div>
      </div>

      {/* Preference chips */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/[0.05] px-5 py-3">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9a9a9a]">Weight by</span>
        {PREFS.map((p) => (
          <button
            key={p.key}
            onClick={() => pickPriority(p.key, p.label)}
            disabled={busy}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 " +
              (priority === p.key
                ? "border-[#FF385C]/40 bg-[#FF385C]/10 text-[#FF385C]"
                : "border-black/[0.1] bg-white text-[#555] hover:border-black/25 hover:text-[#1a1a1a]")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="no-scrollbar max-h-[420px] space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#1c1c1e] px-3.5 py-2 text-sm font-medium leading-relaxed text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-black/[0.025] px-4 py-3 text-sm leading-[1.6] text-[#2a2a2a]"
            >
              {m.streaming && !m.content ? (
                <span className="flex items-center gap-2 text-[#717171]">
                  <TypingIndicator /> Weighing the options…
                </span>
              ) : (
                <div>
                  <ChatMarkdown content={m.content} />
                  {m.streaming && (
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse-soft bg-[#FF385C] align-middle" />
                  )}
                </div>
              )}
            </motion.div>
          ),
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-black/[0.06] p-3">
        <ChatComposer
          onSend={ask}
          disabled={busy}
          placeholder="Ask about these hotels — e.g. which has the better pool, or is the upgrade worth it?"
        />
      </div>
    </div>
  );
}
