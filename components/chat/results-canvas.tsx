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
function hasHotels(m: ChatMessage): boolean {
  const p = m.payload;
  return Boolean((p?.recommendations && p.recommendations.length) || (p?.liveHotels && p.liveHotels.length));
}

export function ResultsCanvas({ messages }: { messages: ChatMessage[] }) {
  // Only ever show the CURRENT search. The moment a new hotel search runs (a new
  // city, a changed proximity/budget/preference), everything before it is stale
  // — so we render only from the latest hotel-results message onward (which also
  // carries any comparison / booking the traveller did for that search).
  let lastSearchIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (hasHotels(messages[i])) {
      lastSearchIdx = i;
      break;
    }
  }
  const withResults = messages.filter(
    (m, i) => messageHasResults(m) && (lastSearchIdx === -1 || i >= lastSearchIdx),
  );
  if (withResults.length === 0) return null;

  return (
    <div className="space-y-10 pb-28">
      <div className="sticky top-0 z-10 -mx-1 bg-background/85 px-1 pb-3 pt-2 backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
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
              <div className="space-y-5">
                {p.recommendations.map((hotel, i) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    index={i}
                    checkIn={p.criteria?.checkIn}
                    checkOut={p.criteria?.checkOut}
                  />
                ))}
              </div>
            )}
            {p.comparison && <ComparisonTable comparison={p.comparison} />}
            {p.liveHotels && p.liveHotels.length > 0 && (
              <LiveHotelCards
                hotels={p.liveHotels}
                checkIn={p.criteria?.checkIn}
                checkOut={p.criteria?.checkOut}
              />
            )}
            {p.booking && <BookingSummary booking={p.booking} />}
          </motion.div>
        );
      })}
    </div>
  );
}
