"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdvisorPayload,
  ChatMessage,
  ChatRequestBody,
} from "@/lib/chat/types";
import type { SearchCriteria } from "@/lib/services/types";
import { useTravelerMemory } from "@/store/traveler-memory-store";
import { useTravelDates } from "@/store/travel-dates-store";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function getSessionId() {
  if (typeof window === "undefined") return "server";
  const KEY = "whatahotel-session";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = uid();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

interface ConversationState {
  sessionId: string;
  messages: ChatMessage[];
  criteria: SearchCriteria;
  isStreaming: boolean;
  started: boolean;
  /** True once the visitor asks for (and is handed to) a human agent. */
  agentMode: boolean;
  /** Latest agent-message timestamp we've shown, for polling. */
  lastAgentTs: number;
  send: (text: string, intent?: ChatRequestBody["intent"]) => Promise<void>;
  requestAgent: () => Promise<void>;
  sendToAgent: (text: string) => Promise<void>;
  ingestAgent: (msgs: { role: string; content: string; ts: number }[]) => void;
  reset: () => void;
}

export const useConversation = create<ConversationState>()(
  persist(
    (set, get) => ({
  sessionId: getSessionId(),
  messages: [],
  criteria: {},
  isStreaming: false,
  started: false,
  agentMode: false,
  lastAgentTs: 0,

  reset: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("whatahotel-session");
    }
    set({
      sessionId: uid(),
      messages: [],
      criteria: {},
      agentMode: false,
      lastAgentTs: 0,
      isStreaming: false,
      started: false,
    });
  },

  send: async (text, intent) => {
    const { sessionId, messages, isStreaming } = get();
    if (isStreaming || (!text.trim() && !intent)) return;

    // Remember durable preferences across every chatbot on the site.
    if (text.trim()) useTravelerMemory.getState().learn(text);
    const memory = useTravelerMemory.getState().notes;
    const timeOfDay = partOfDay();

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text.trim(),
    };
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      loadingLabel: loadingLabelFor(text, intent),
    };

    // For intent-only sends (e.g. a card button), still show the user's action.
    const visibleUser = text.trim()
      ? [userMsg]
      : intent
        ? [{ ...userMsg, content: intentLabel(intent) }]
        : [];

    const history = [...messages, ...visibleUser].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    set({
      messages: [...messages, ...visibleUser, assistantMsg],
      isStreaming: true,
      started: true,
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: history, intent, memory, timeOfDay }),
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const patchAssistant = (updater: (m: ChatMessage) => ChatMessage) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === assistantId ? updater(m) : m)),
        }));

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const data = JSON.parse(json) as
              | { type: "text"; value: string }
              | { type: "final"; payload: AdvisorPayload };
            if (data.type === "text") {
              patchAssistant((m) => ({ ...m, content: m.content + data.value }));
            } else if (data.type === "final") {
              patchAssistant((m) => ({ ...m, payload: data.payload }));
              set({ criteria: data.payload.criteria });
              // Share the trip dates so hotel/stay pages (and their Reserve
              // deep-links to the real booking form) inherit them.
              const { checkIn, checkOut } = data.payload.criteria;
              if (checkIn && checkOut) useTravelDates.getState().setDates(checkIn, checkOut);
            }
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } catch {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  m.content ||
                  "I'm having trouble reaching the concierge desk. Please try again in a moment.",
              }
            : m,
        ),
      }));
    } finally {
      set((s) => ({
        isStreaming: false,
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m,
        ),
      }));
      // Persist the transcript for the CRM (fire-and-forget).
      const st = get();
      fetch("/api/chat/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: st.sessionId,
          messages: st.messages.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content })),
          city: st.criteria.destinationLabel,
        }),
      }).catch(() => {});
    }
  },

  requestAgent: async () => {
    const { sessionId, agentMode } = get();
    if (agentMode) return;
    set((s) => ({
      agentMode: true,
      started: true,
      messages: [
        ...s.messages,
        {
          id: uid(),
          role: "assistant",
          content:
            "You've asked to speak with a human advisor — I've flagged this conversation. A member of our team will reply right here shortly. You can keep typing in the meantime.",
        },
      ],
    }));
    await fetch("/api/chat/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "request" }),
    }).catch(() => {});
  },

  sendToAgent: async (text) => {
    const t = text.trim();
    if (!t) return;
    const { sessionId } = get();
    set((s) => ({ messages: [...s.messages, { id: uid(), role: "user", content: t }] }));
    await fetch("/api/chat/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "message", content: t }),
    }).catch(() => {});
  },

  ingestAgent: (msgs) => {
    if (!msgs.length) return;
    const seen = new Set(get().messages.map((m) => m.content));
    const toAdd = msgs
      .filter((m) => m.role === "agent" && !seen.has(m.content))
      .map((m) => ({ id: uid(), role: "assistant" as const, content: m.content, fromAgent: true }));
    const maxTs = Math.max(get().lastAgentTs, ...msgs.map((m) => m.ts));
    if (!toAdd.length) {
      if (maxTs > get().lastAgentTs) set({ lastAgentTs: maxTs });
      return;
    }
    set((s) => ({ messages: [...s.messages, ...toAdd], lastAgentTs: maxTs }));
  },
    }),
    {
      name: "whatahotel-conversation",
      // Keep the transcript + learned criteria, but NOT `started`/`isStreaming`,
      // so returning guests keep their history yet still land on the browse page
      // until they reopen the chat. Streaming/loading flags are dropped.
      partialize: (s) => ({
        messages: s.messages
          .filter((m) => !m.streaming)
          .slice(-30)
          .map((m) => ({ id: m.id, role: m.role, content: m.content, payload: m.payload })),
        criteria: s.criteria,
      }),
    },
  ),
);

/** The traveller's local time of day, so the advisor can greet naturally. */
function partOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

/** A contextual loading message so the traveller knows what's being prepared. */
function loadingLabelFor(text: string, intent?: ChatRequestBody["intent"]): string {
  const t = text.toLowerCase();
  if (intent?.type === "compare" || /\bcompare\b|side by side|versus|\bvs\b|difference between/.test(t))
    return "Comparing live rates, perks & details…";
  if (intent?.type === "book" || /\bbook\b|reserve\b/.test(t)) return "Preparing your booking…";
  if (/\bshow me\b|find me\b|best hotel|top hotel|recommend|options|suggest/.test(t))
    return "Finding the best matches…";
  return "Thinking…";
}

function intentLabel(intent: NonNullable<ChatRequestBody["intent"]>): string {
  switch (intent.type) {
    case "compare":
      return "Compare these for me";
    case "book":
      return "I'd like to book this";
    case "details":
      return "Tell me more about this hotel";
    default:
      return "";
  }
}
