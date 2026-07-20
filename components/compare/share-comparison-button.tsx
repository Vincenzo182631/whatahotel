"use client";

import { useState } from "react";
import { Share2, Check, Link2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Share This Hotel Comparison" — visible to every guest on the /compare page.
 * Opens a short form (who it's for + a personal note), then shares a public
 * /compare link that carries that personalisation so the recipient sees a warm
 * "prepared for you" banner. Uses the native share sheet on mobile when
 * available, otherwise copies the link to the clipboard.
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
  const [open, setOpen] = useState(false);
  const [toName, setToName] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const field =
    "w-full rounded-xl border border-[#DDDDDD] px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

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
    if (toName.trim()) p.set("to", toName.trim().slice(0, 80));
    if (note.trim()) p.set("note", note.trim().slice(0, 400));
    return `${origin}/compare?${p.toString()}`;
  };

  const share = async () => {
    const url = buildUrl();
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: "Hotel comparison — WhataHotel", url });
        setOpen(false);
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
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[#FF385C]/40 bg-[#FF385C]/[0.06] px-4 py-2 text-sm font-semibold text-[#FF385C] transition-colors hover:bg-[#FF385C]/10 sm:min-h-0 sm:w-auto"
      >
        <Share2 className="size-4" /> Share This Hotel Comparison
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
              <Sparkles className="size-4 text-[#FF385C]" /> Share this comparison
            </p>
            <button onClick={() => setOpen(false)} className="text-[#9a9a9a] hover:text-[#1a1a1a]">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            <input
              className={field}
              placeholder="Who's this for? (optional)"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
            />
            <textarea
              className={cn(field, "min-h-20 resize-y")}
              placeholder="Add a personal note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              onClick={share}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {copied ? "Link copied!" : "Copy / share link"}
            </button>
            <p className="text-xs text-[#717171]">
              Creates a public link to this side-by-side comparison{checkIn && checkOut ? " for your dates" : ""}. Anyone with the link sees the same hotels.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
