"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/**
 * "Share This Hotel Comparison" — visible to every guest on the /compare page.
 * Uses the native share sheet on mobile when available, otherwise copies the
 * comparison link to the clipboard. The /compare URL is public, so anyone with
 * it sees the same side-by-side comparison for the same dates.
 */
export function ShareComparisonButton({
  hotelIds,
  checkIn,
  checkOut,
}: {
  hotelIds: string[];
  checkIn: string;
  checkOut: string;
}) {
  const [copied, setCopied] = useState(false);

  const buildUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const p = new URLSearchParams();
    const [a, b, c] = hotelIds;
    if (a) p.set("a", a);
    if (b) p.set("b", b);
    if (c) p.set("c", c);
    if (checkIn && checkOut) {
      p.set("checkIn", checkIn);
      p.set("checkOut", checkOut);
    }
    return `${origin}/compare?${p.toString()}`;
  };

  const share = async () => {
    const url = buildUrl();
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: "Hotel comparison — WhataHotel", url });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to copy */
      }
    }
    try {
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={share}
      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[#FF385C]/40 bg-[#FF385C]/[0.06] px-4 py-2 text-sm font-semibold text-[#FF385C] transition-colors hover:bg-[#FF385C]/10 sm:min-h-0 sm:w-auto"
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? "Link copied!" : "Share This Hotel Comparison"}
    </button>
  );
}
