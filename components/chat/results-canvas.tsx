"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/chat/types";
import { HotelCard } from "@/components/hotel/hotel-card";
import { ComparisonTable } from "@/components/hotel/comparison-table";
import { BookingSummary } from "@/components/hotel/booking-summary";
import { LiveHotelCards } from "./live-hotel-cards";

export function messageHasResults(m: ChatMessage): boolean {
  const p = m.payload;
  return Boolean(
    (p?.recommendations && p.recommendations.length > 0) ||
      (p?.liveHotels && p.liveHotels.length > 0) ||
      p?.comparison ||
      p?.booking,
  );
}

/**
 * Right-hand "canvas" that mirrors every result the advisor has surfaced so far
 * — hotel shortlists, the side-by-side comparison and any booking summary —
 * leaving the left column as a clean conversation thread.
 */
export function ResultsCanvas({ messages }: { messages: ChatMessage[] }) {
  const withResults = messages.filter(messageHasResults);
  if (withResults.length === 0) return null;

  return (
    <div className="space-y-8 pb-10">
      <div className="sticky top-0 z-10 -mx-1 bg-background/85 px-1 py-2 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your shortlist
        </p>
      </div>

      {withResults.map((m) => {
        const p = m.payload!;
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {p.recommendations && p.recommendations.length > 0 && (
              <div className="space-y-4">
                {p.recommendations.map((hotel, i) => (
                  <HotelCard key={hotel.id} hotel={hotel} index={i} />
                ))}
              </div>
            )}
            {p.comparison && <ComparisonTable comparison={p.comparison} />}
            {p.liveHotels && p.liveHotels.length > 0 && (
              <LiveHotelCards hotels={p.liveHotels} />
            )}
            {p.booking && <BookingSummary booking={p.booking} />}
          </motion.div>
        );
      })}
    </div>
  );
}
