"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat/types";
import { TypingIndicator } from "./typing-indicator";
import { HotelCard } from "@/components/hotel/hotel-card";
import { ComparisonTable } from "@/components/hotel/comparison-table";
import { BookingSummary } from "@/components/hotel/booking-summary";
import { LiveHotelCards } from "./live-hotel-cards";

function AdvisorMark() {
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_-4px_rgba(16,33,58,0.25)] ring-1 ring-black/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/chat-icon.png" alt="" className="size-5" />
    </div>
  );
}

export function MessageBubble({
  message,
  canvasActive = false,
}: {
  message: ChatMessage;
  /** When the right-hand results canvas is shown, hide inline attachments on desktop. */
  canvasActive?: boolean;
}) {
  const isUser = message.role === "user";
  const payload = message.payload;
  const showTyping = message.streaming && !message.content;

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-gold-sheen px-5 py-3 text-[15px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(183,79,84,0.6)]">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <AdvisorMark />
      <div className="min-w-0 flex-1 space-y-4">
        <div className="max-w-[88%] rounded-3xl rounded-tl-lg glass px-5 py-3.5">
          {showTyping ? (
            <TypingIndicator label={message.loadingLabel} />
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {message.content}
              {message.streaming && (
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse-soft bg-primary" />
              )}
            </p>
          )}
        </div>

        {/* Attachments — inline on mobile; hoisted to the results canvas on desktop */}
        <div className={cn("space-y-4", canvasActive && "lg:hidden")}>
          {payload?.recommendations && payload.recommendations.length > 0 && (
            <div className="space-y-4">
              {payload.recommendations.map((hotel, i) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  index={i}
                  checkIn={payload.criteria?.checkIn}
                  checkOut={payload.criteria?.checkOut}
                />
              ))}
            </div>
          )}

          {payload?.comparison && (
            <ComparisonTable comparison={payload.comparison} />
          )}

          {payload?.liveHotels && payload.liveHotels.length > 0 && (
            <LiveHotelCards
              hotels={payload.liveHotels}
              checkIn={payload.criteria?.checkIn}
              checkOut={payload.criteria?.checkOut}
            />
          )}

          {payload?.booking && <BookingSummary booking={payload.booking} />}
        </div>
      </div>
    </motion.div>
  );
}
