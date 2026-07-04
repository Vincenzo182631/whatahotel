"use client";

import { create } from "zustand";
import type {
  AdvisorPayload,
  ChatMessage,
  ChatRequestBody,
} from "@/lib/chat/types";
import type { SearchCriteria } from "@/lib/services/types";
import { useTravelerMemory } from "@/store/traveler-memory-store";

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
  send: (text: string, intent?: ChatRequestBody["intent"]) => Promise<void>;
  reset: () => void;
}

export const useConversation = create<ConversationState>()((set, get) => ({
  sessionId: getSessionId(),
  messages: [],
  criteria: {},
  isStreaming: false,
  started: false,

  reset: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("whatahotel-session");
    }
    set({
      sessionId: uid(),
      messages: [],
      criteria: {},
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
        body: JSON.stringify({ sessionId, messages: history, intent, memory }),
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
    }
  },
}));

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
