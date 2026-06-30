"use client";

import { motion } from "framer-motion";
import { Check, Loader2, CircleDot } from "lucide-react";
import type { BookingDraft } from "@/lib/chat/types";

const FIELD_LABELS: Record<string, string> = {
  guestName: "Guest name",
  email: "Email",
  phone: "Phone",
  bedPreference: "Bed preference",
  specialRequests: "Special requests",
  arrivalTime: "Arrival time",
};

const ORDER = [
  "guestName",
  "email",
  "phone",
  "bedPreference",
  "specialRequests",
  "arrivalTime",
];

export function BookingSummary({ booking }: { booking: BookingDraft }) {
  const progress = Math.round((booking.collected.length / ORDER.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl glass-strong shadow-card"
    >
      <div className="flex items-center justify-between gap-4 border-b border-black/[0.08] p-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground/65">
            {booking.complete ? "Reservation summary" : "Securing your stay"}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-medium">
            {booking.hotelName}
          </h3>
        </div>
        {booking.complete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            <Check className="size-3.5" /> Ready to confirm
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground/72">
            <Loader2 className="size-3.5 animate-spin text-primary" /> {progress}%
          </span>
        )}
      </div>

      <div className="h-1 w-full bg-black/[0.04]">
        <div
          className="h-full bg-gold-sheen transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="divide-y divide-black/[0.06]">
        {ORDER.map((field) => {
          const done = booking.collected.includes(field);
          const value = (booking as unknown as Record<string, unknown>)[
            field
          ] as string | undefined;
          const active = booking.nextField === field;
          return (
            <li
              key={field}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="flex items-center gap-2.5 text-foreground/70">
                {done ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <CircleDot
                    className={`size-4 ${active ? "text-primary animate-pulse-soft" : "text-foreground/30"}`}
                  />
                )}
                {FIELD_LABELS[field]}
              </span>
              <span className="text-right text-foreground/90">
                {done ? value || "—" : active ? "Awaiting your reply…" : ""}
              </span>
            </li>
          );
        })}
      </ul>

      {booking.complete && (
        <div className="border-t border-primary/15 bg-primary/5 p-4 text-sm text-foreground/80">
          Your advisor will confirm availability and apply the advisor rate plus
          all exclusive perks. You'll receive a confirmation by email shortly.
        </div>
      )}
    </motion.div>
  );
}
