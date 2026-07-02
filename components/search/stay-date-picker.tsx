"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

/** Updates ?checkIn/?checkOut on the live stay page to refresh live rates. */
export function StayDatePicker({
  checkIn: initIn,
  checkOut: initOut,
}: {
  checkIn?: string;
  checkOut?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkIn, setCheckIn] = useState(initIn ?? "");
  const [checkOut, setCheckOut] = useState(initOut ?? "");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
      : 0;

  const apply = () => {
    if (nights <= 0) return;
    router.push(`${pathname}?checkIn=${checkIn}&checkOut=${checkOut}`);
  };

  const input =
    "rounded-xl border border-[#DDDDDD] bg-white px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-[#717171]">
        Check-in
        <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-[#717171]">
        Check-out
        <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className={input} />
      </label>
      <button
        onClick={apply}
        disabled={nights <= 0}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        <CalendarDays className="size-4" /> Show rates
      </button>
    </div>
  );
}
