"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useTravelDates } from "@/store/travel-dates-store";

/**
 * Editable date bar on the /compare page. Changing check-in / check-out reloads
 * the comparison for the new dates (updates the URL, which drives the live rate
 * fetch) — so guests can adjust dates in place instead of starting over.
 */
export function CompareDateBar({
  hotelIds,
  checkIn,
  checkOut,
}: {
  hotelIds: string[];
  checkIn: string;
  checkOut: string;
}) {
  const router = useRouter();
  const setDates = useTravelDates((s) => s.setDates);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const apply = (nextIn: string, nextOut: string) => {
    if (!nextIn || !nextOut) return;
    if (new Date(nextOut).getTime() <= new Date(nextIn).getTime()) return;
    setDates(nextIn, nextOut);
    const p = new URLSearchParams();
    const [a, b, c] = hotelIds;
    p.set("a", a);
    if (b) p.set("b", b);
    if (c) p.set("c", c);
    p.set("checkIn", nextIn);
    p.set("checkOut", nextOut);
    router.push(`/compare?${p.toString()}`);
  };

  const input =
    "rounded-lg border border-[#DDDDDD] px-2.5 py-1.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

  return (
    <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#EBEBEB] bg-[#fafafa] px-3 py-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-[#717171]">
        <CalendarDays className="size-4 text-[#FF385C]" /> Dates
      </span>
      <input
        type="date"
        aria-label="Check-in"
        value={checkIn}
        min={today}
        onChange={(e) => apply(e.target.value, checkOut)}
        className={input}
      />
      <span className="text-[#9a9a9a]">→</span>
      <input
        type="date"
        aria-label="Check-out"
        value={checkOut}
        min={checkIn || today}
        onChange={(e) => apply(checkIn, e.target.value)}
        className={input}
      />
    </div>
  );
}
