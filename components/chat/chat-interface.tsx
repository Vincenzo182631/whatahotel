"use client";

import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { useConversation } from "@/store/conversation-store";
import { MessageBubble } from "./message-bubble";
import { ChatComposer } from "./chat-composer";
import { CriteriaBar } from "./criteria-bar";
import { SUGGESTION_CHIPS } from "./suggested-prompts";

export function ChatInterface() {
  const messages = useConversation((s) => s.messages);
  const isStreaming = useConversation((s) => s.isStreaming);
  const criteria = useConversation((s) => s.criteria);
  const send = useConversation((s) => s.send);
  const reset = useConversation((s) => s.reset);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-4.5rem)] w-full max-w-3xl flex-col px-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 py-3">
        <CriteriaBar criteria={criteria} />
        <button
          onClick={reset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground/65 transition-colors hover:bg-black/[0.04] hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> New trip
        </button>
      </div>

      {/* Messages */}
      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions before the user has typed much */}
      {messages.length <= 2 && (
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
          {SUGGESTION_CHIPS.slice(0, 5).map((chip) => (
            <button
              key={chip.label}
              disabled={isStreaming}
              onClick={() => send(chip.prompt)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs text-foreground/75 transition-colors hover:text-primary disabled:opacity-50"
            >
              <span>{chip.emoji}</span>
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="pb-4">
        <ChatComposer
          onSend={(t) => send(t)}
          disabled={isStreaming}
          autoFocus
          placeholder={
            isStreaming ? "Your advisor is replying…" : "Reply to your advisor…"
          }
        />
      </div>
    </div>
  );
}
