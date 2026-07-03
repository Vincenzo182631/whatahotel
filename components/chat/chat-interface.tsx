"use client";

import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversation } from "@/store/conversation-store";
import { MessageBubble } from "./message-bubble";
import { ChatComposer } from "./chat-composer";
import { CriteriaBar } from "./criteria-bar";
import { SUGGESTION_CHIPS } from "./suggested-prompts";
import { ResultsCanvas, messageHasResults } from "./results-canvas";

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

  // Once the advisor has surfaced hotels/comparisons, split into two columns:
  // conversation on the left, results canvas on the right (desktop only).
  const hasResults = messages.some(messageHasResults);

  // Latest shortlist, for contextual follow-up chips.
  const lastRecs = [...messages]
    .reverse()
    .find((m) => m.payload?.recommendations?.length)?.payload?.recommendations;

  return (
    <div
      className={cn(
        "mx-auto h-[calc(100dvh-4.5rem)] w-full px-4",
        hasResults ? "max-w-[1440px] lg:px-8" : "max-w-3xl",
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col",
          hasResults && "lg:flex-row lg:gap-10",
        )}
      >
        {/* Conversation column */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            hasResults && "lg:w-[30rem] lg:flex-none lg:border-r lg:border-border/70 lg:pr-8",
          )}
        >
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
              <MessageBubble key={m.id} message={m} canvasActive={hasResults} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Contextual follow-ups once a shortlist exists */}
          {lastRecs && lastRecs.length > 0 && (
            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
              {lastRecs.length >= 2 && (
                <button
                  disabled={isStreaming}
                  onClick={() =>
                    send("Compare the top two side by side.", {
                      type: "compare",
                      hotelIds: [lastRecs[0].id, lastRecs[1].id],
                    })
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs text-foreground/75 transition-colors hover:text-primary disabled:opacity-50"
                >
                  ⚖️ Compare top two
                </button>
              )}
              <button
                disabled={isStreaming}
                onClick={() => send("Why did you rank the first one first?")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs text-foreground/75 transition-colors hover:text-primary disabled:opacity-50"
              >
                💡 Why the top pick?
              </button>
              <button
                disabled={isStreaming}
                onClick={() =>
                  send("I'd like to book the top pick.", {
                    type: "book",
                    hotelIds: [lastRecs[0].id],
                  })
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs text-foreground/75 transition-colors hover:text-primary disabled:opacity-50"
              >
                ✅ Book the top pick
              </button>
            </div>
          )}

          {/* Quick suggestions before the user has typed much */}
          {!lastRecs && messages.length <= 2 && (
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
                isStreaming
                  ? "Comparing…"
                  : "Ask to compare any hotels, or reply…"
              }
            />
          </div>
        </div>

        {/* Results canvas column (desktop only) */}
        {hasResults && (
          <div className="no-scrollbar hidden min-h-0 flex-1 overflow-y-auto py-3 lg:block">
            <ResultsCanvas messages={messages} />
          </div>
        )}
      </div>
    </div>
  );
}
