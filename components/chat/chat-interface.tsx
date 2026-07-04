"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, Headset } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversation } from "@/store/conversation-store";
import { MessageBubble } from "./message-bubble";
import { ChatComposer } from "./chat-composer";
import { CriteriaBar } from "./criteria-bar";
import { SUGGESTION_CHIPS } from "./suggested-prompts";
import { ResultsCanvas, messageHasResults } from "./results-canvas";
import { CompareBar } from "./compare-bar";
import { LeadGate } from "./lead-gate";
import { useAuth } from "@/hooks/use-auth";

/** Number of advisor replies before a visitor must sign up to keep going. */
const FREE_EXCHANGES = 3;

export function ChatInterface() {
  const messages = useConversation((s) => s.messages);
  const isStreaming = useConversation((s) => s.isStreaming);
  const criteria = useConversation((s) => s.criteria);
  const send = useConversation((s) => s.send);
  const reset = useConversation((s) => s.reset);
  const agentMode = useConversation((s) => s.agentMode);
  const requestAgent = useConversation((s) => s.requestAgent);
  const sendToAgent = useConversation((s) => s.sendToAgent);
  const ingestAgent = useConversation((s) => s.ingestAgent);
  const sessionId = useConversation((s) => s.sessionId);
  const lastAgentTs = useConversation((s) => s.lastAgentTs);
  const { user, isLoading: authLoading } = useAuth();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // While a human agent is handling the chat, poll for their replies.
  useEffect(() => {
    if (!agentMode) return;
    let active = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/chat/agent?sessionId=${encodeURIComponent(sessionId)}&since=${lastAgentTs}`);
        if (!r.ok) return;
        const d = await r.json();
        if (active && Array.isArray(d.messages)) ingestAgent(d.messages);
      } catch {
        /* ignore */
      }
    };
    tick();
    const iv = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [agentMode, sessionId, lastAgentTs, ingestAgent]);

  // Once the advisor has surfaced hotels/comparisons, split into two columns:
  // conversation on the left, results canvas on the right (desktop only).
  const hasResults = messages.some(messageHasResults);

  // Latest shortlist, for contextual follow-up chips.
  const lastRecs = [...messages]
    .reverse()
    .find((m) => m.payload?.recommendations?.length)?.payload?.recommendations;

  // Sign-up gate: after a few advisor replies, a not-signed-in visitor must
  // create a free account (captured as a lead) to keep chatting/comparing.
  const advisorTurns = messages.filter((m) => m.role === "assistant" && !m.streaming).length;
  const gated = !authLoading && !user && advisorTurns >= FREE_EXCHANGES && !isStreaming;

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
          {!gated && lastRecs && lastRecs.length > 0 && (
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
          {!gated && !lastRecs && messages.length <= 2 && (
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

          {/* Composer — the sign-up gate, the live-agent chat, or the AI composer */}
          <div className="pb-4">
            {gated ? (
              <LeadGate
                context={{
                  city: criteria.destinationLabel,
                  checkIn: criteria.checkIn,
                  checkOut: criteria.checkOut,
                  exchanges: advisorTurns,
                }}
              />
            ) : agentMode ? (
              <>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Headset className="size-3.5" /> You're with a human advisor — replies appear here.
                </p>
                <ChatComposer onSend={(t) => sendToAgent(t)} autoFocus placeholder="Message your advisor…" />
              </>
            ) : (
              <>
                <ChatComposer
                  onSend={(t) => send(t)}
                  disabled={isStreaming}
                  autoFocus
                  placeholder={isStreaming ? "Comparing…" : "Ask to compare any hotels, or reply…"}
                />
                <button
                  onClick={requestAgent}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground/55 transition-colors hover:text-primary"
                >
                  <Headset className="size-3.5" /> Talk to a human advisor
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results canvas column (desktop only) */}
        {hasResults && (
          <div className="no-scrollbar hidden min-h-0 flex-1 overflow-y-auto py-3 lg:block">
            <ResultsCanvas messages={messages} />
          </div>
        )}
      </div>

      {/* Floating compare tray (appears once hotels are selected) */}
      <CompareBar />
    </div>
  );
}
