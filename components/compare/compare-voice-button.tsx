"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { RealtimeVoice } from "@/components/voice/realtime-voice";

/**
 * "Talk it through live" on the comparison/offer pages — opens a real-time voice
 * call with the advisor, grounded strictly in THIS comparison's hotels + dates.
 */
export function CompareVoiceButton({
  hotelIds,
  checkIn,
  checkOut,
}: {
  hotelIds: string[];
  checkIn: string;
  checkOut: string;
}) {
  const [open, setOpen] = useState(false);
  if (hotelIds.length < 2) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(255,56,92,0.6)] transition-transform hover:scale-[1.03]"
      >
        <Mic className="size-4" strokeWidth={2.5} /> Talk it through live
      </button>
      {open && (
        <RealtimeVoice
          onClose={() => setOpen(false)}
          session={{ mode: "compare", ids: hotelIds, checkIn, checkOut }}
        />
      )}
    </>
  );
}
