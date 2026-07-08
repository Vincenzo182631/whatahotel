"use client";

import { useState } from "react";
import { Share2, Loader2, Link2, Check, ExternalLink, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Agent-only shortcut on the /compare page: turn the current comparison into a
 * shareable offer link without going to the dashboard builder. The advisor
 * copies the link and pastes it into their own email/message to the guest.
 * Rendered only for the advisor (the compare page checks the admin email).
 */
export function ShareOfferButton({
  hotelIds,
  city,
  checkIn,
  checkOut,
}: {
  hotelIds: string[];
  city: string;
  checkIn: string;
  checkOut: string;
}) {
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [offer, setOffer] = useState<{ id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = offer ? `${origin}/offer/${offer.id}` : "";

  const field =
    "w-full rounded-xl border border-[#DDDDDD] px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

  const create = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, checkIn, checkOut, hotelIds, guestName, note }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(res.status === 403 ? "Sign in as an advisor to share offers." : d?.error || "Couldn't create the offer.");
        return;
      }
      setOffer(d.offer);
    } catch {
      setError("Couldn't create the offer — try again.");
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#FF385C]/40 bg-[#FF385C]/[0.06] px-3.5 py-2 text-sm font-semibold text-[#FF385C] transition-colors hover:bg-[#FF385C]/10"
      >
        <Share2 className="size-4" /> Share this comparison
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
              <Sparkles className="size-4 text-[#FF385C]" /> Share as an offer
            </p>
            <button onClick={() => setOpen(false)} className="text-[#9a9a9a] hover:text-[#1a1a1a]">
              <X className="size-4" />
            </button>
          </div>

          {error && <p className="mt-2 rounded-lg bg-[#FF385C]/[0.08] px-2.5 py-1.5 text-xs text-[#c2334f]">{error}</p>}

          {!offer ? (
            <div className="mt-3 space-y-2.5">
              <input className={field} placeholder="Guest first name (optional)" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              <textarea className={cn(field, "min-h-20 resize-y")} placeholder="A personal note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button
                onClick={create}
                disabled={creating}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Create offer link
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#EBEBEB] bg-[#fafafa] px-3 py-2">
                <Link2 className="size-4 shrink-0 text-[#717171]" />
                <span className="truncate text-xs text-[#333]">{link}</span>
              </div>
              <p className="text-xs text-[#717171]">Copy this link and paste it into your own email or message to the guest.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-[#FF385C] px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                  {copied ? <Check className="size-4" /> : <Link2 className="size-4" />} {copied ? "Copied!" : "Copy link"}
                </button>
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[#717171] hover:bg-black/[0.04]">
                  <ExternalLink className="size-4" /> Open
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
