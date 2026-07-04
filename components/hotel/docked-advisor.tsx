"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ChatMarkdown, type ChatImage } from "@/components/chat/chat-markdown";
import { answerHotelQuestion, DOCKED_SUGGESTIONS } from "@/lib/chat/hotel-qa";
import { useTravelDates } from "@/store/travel-dates-store";
import type { Hotel } from "@/lib/services/types";

interface QA {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function DockedAdvisor({ hotel }: { hotel: Hotel }) {
  const [messages, setMessages] = useState<QA[]>([
    {
      id: "intro",
      role: "assistant",
      content: `I'm your personal advisor for **${hotel.name}** — I know the rooms, dining, perks and the whole destination. Ask me which room suits you, the best nearby restaurants or beaches, how far the airport is, or say the occasion (honeymoon, family, anniversary) and I'll tailor everything. Want a 3-day plan? Just ask.`,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Record<string, ChatImage>>({});
  const [bookings, setBookings] = useState<Record<string, ChatImage>>({});
  const checkIn = useTravelDates((s) => s.checkIn);
  const checkOut = useTravelDates((s) => s.checkOut);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load the real photo manifest so we can resolve the advisor's [img:ID] tags.
  useEffect(() => {
    let active = true;
    fetch(`/api/hotel-images?hotelId=${encodeURIComponent(hotel.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { images?: { id: string; url: string; label: string }[] } | null) => {
        if (!active || !d?.images) return;
        const map: Record<string, ChatImage> = {};
        for (const im of d.images) map[im.id] = { url: im.url, label: im.label };
        setImages(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hotel.id]);

  // Load the prefilled booking links for the guest's dates so [book:ID] tags
  // resolve to real Reserve buttons. Refreshes when the dates change.
  useEffect(() => {
    if (!checkIn || !checkOut) {
      setBookings({});
      return;
    }
    let active = true;
    fetch(
      `/api/hotel-booking?hotelId=${encodeURIComponent(hotel.id)}&checkIn=${checkIn}&checkOut=${checkOut}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { bookings?: { id: string; url: string; room: string }[] } | null) => {
        if (!active || !d?.bookings) return;
        const map: Record<string, ChatImage> = {};
        for (const b of d.bookings) map[b.id] = { url: b.url, label: b.room };
        setBookings(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hotel.id, checkIn, checkOut]);

  const ask = async (question: string) => {
    if (busy || !question.trim()) return;
    const uid = Math.random().toString(36).slice(2);
    const aid = uid + "-a";
    const history = messages
      .filter((m) => m.id !== "intro")
      .map((m) => ({ role: m.role, content: m.content }));

    setBusy(true);
    setMessages((m) => [
      ...m,
      { id: uid, role: "user", content: question },
      { id: aid, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/hotel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: hotel.id, question, history, checkIn, checkOut }),
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
        m.map((x) => (x.id === aid ? { ...x, content: x.content || answerHotelQuestion(hotel, question) } : x)),
      );
    } finally {
      setBusy(false);
      setMessages((m) => m.map((x) => (x.id === aid ? { ...x, streaming: false } : x)));
    }
  };

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] lg:h-[640px]">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5">
        <span className="grid size-8 place-items-center rounded-full bg-[#f7f7f7] ring-1 ring-black/[0.05]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/chat-icon.png" alt="" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1a1a1a]">WhataHotel Advisor</p>
          <p className="flex items-center gap-1 text-[11px] text-[#717171]">
            <Sparkles className="size-3 text-primary" /> Ask about this hotel
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
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
              className="max-w-[92%] rounded-2xl rounded-tl-md bg-black/[0.035] px-3.5 py-2.5 text-sm leading-[1.6] text-[#2a2a2a]"
            >
              {m.streaming && !m.content ? (
                <TypingIndicator />
              ) : (
                <div className="text-[#2a2a2a]">
                  <ChatMarkdown content={m.content} images={images} bookings={bookings} />
                  {m.streaming && (
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse-soft bg-primary align-middle" />
                  )}
                </div>
              )}
            </motion.div>
          ),
        )}
      </div>

      {/* Suggestions */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {DOCKED_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={busy}
            className="shrink-0 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs text-[#555] transition-colors hover:border-black/20 hover:text-[#1a1a1a] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="p-3 pt-1">
        <ChatComposer onSend={ask} disabled={busy} placeholder="Ask about this hotel…" />
      </div>
    </div>
  );
}
