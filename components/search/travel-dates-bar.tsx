"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useTravelDates } from "@/store/travel-dates-store";
import { cn } from "@/lib/utils";

/**
 * A compact travel-dates picker bound to the global remembered dates. Set dates
 * here and live rates appear on every hotel card across the app.
 */
export function TravelDatesBar({ className }: { className?: string }) {
  const { checkIn, checkOut, setDates, setCheckIn, setCheckOut } = useTravelDates();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const hasDates = Boolean(checkIn && checkOut);

  const input =
    "rounded-xl border border-[#DDDDDD] bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-2xl border border-[#EBEBEB] bg-white p-3",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 pb-2 text-sm font-medium text-[#222]">
        <CalendarDays className="size-4 text-[#FF385C]" />
        {hasDates ? "Live rates for your dates" : "Add dates to see live rates"}
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-[#717171]">
        Check-in
        <input
          type="date"
          value={checkIn}
          min={today}
          onChange={(e) => setCheckIn(e.target.value)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-[#717171]">
        Check-out
        <input
          type="date"
          value={checkOut}
          min={checkIn || today}
          onChange={(e) => setCheckOut(e.target.value)}
          className={input}
        />
      </label>
      {hasDates && (
        <button
          onClick={() => setDates("", "")}
          className="pb-2 text-xs font-medium text-[#717171] underline-offset-2 hover:text-[#FF385C] hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
