"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { answerHotelQuestion, DOCKED_SUGGESTIONS } from "@/lib/chat/hotel-qa";
import type { Hotel } from "@/lib/services/types";

interface QA {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function DockedAdvisor({ hotel }: { hotel: Hotel }) {
  const [messages, setMessages] = useState<QA[]>([
    {
      id: "intro",
      role: "assistant",
      content: `I'm right here while you explore ${hotel.name}. Ask me anything — connecting rooms, the best view, how far the airport is — or say "book" when you're ready.`,
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const ask = (question: string) => {
    if (thinking) return;
    const id = Math.random().toString(36).slice(2);
    setMessages((m) => [...m, { id, role: "user", content: question }]);
    setThinking(true);
    const answer = answerHotelQuestion(hotel, question);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: id + "-a", role: "assistant", content: answer },
      ]);
      setThinking(false);
    }, 650);
  };

  return (
    <div className="glass-strong flex h-[640px] flex-col overflow-hidden rounded-3xl shadow-card">
      <div className="flex items-center gap-2.5 border-b border-black/[0.08] p-4">
        <span className="grid size-8 place-items-center rounded-full bg-white ring-1 ring-black/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/chat-icon.png" alt="" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium">WhataHotel Advisor</p>
          <p className="flex items-center gap-1 text-[11px] text-foreground/50">
            <Sparkles className="size-3 text-primary" /> Ask about this hotel
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gold-sheen px-4 py-2 text-sm font-medium text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[90%] rounded-2xl rounded-tl-md glass px-4 py-2.5 text-sm leading-relaxed text-foreground/90"
            >
              {m.content}
            </motion.div>
          ),
        )}
        {thinking && (
          <div className="max-w-[60%] rounded-2xl rounded-tl-md glass px-4 py-3">
            <TypingIndicator />
          </div>
        )}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {DOCKED_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={thinking}
            className="shrink-0 rounded-full border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-3 pt-1">
        <ChatComposer
          onSend={ask}
          disabled={thinking}
          placeholder="Ask about this hotel…"
        />
      </div>
    </div>
  );
}
