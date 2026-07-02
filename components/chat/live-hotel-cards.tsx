"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import type { LiveHotel } from "@/lib/services/live-rates";
import { formatCurrency } from "@/lib/utils";

/** Live API results rendered in the chat — each opens the in-app stay page. */
export function LiveHotelCards({
  hotels,
  checkIn,
  checkOut,
}: {
  hotels: LiveHotel[];
  checkIn?: string;
  checkOut?: string;
}) {
  if (!hotels.length) return null;
  const dates = checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
  return (
    <div className="space-y-3">
      {hotels.map((h) => (
        <Link
          key={h.sourceHotelId}
          href={`/stay/${h.sourceHotelId}${dates}`}
          className="group flex gap-3 rounded-2xl glass p-3 transition-shadow hover:shadow-card"
        >
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
            <ImageWithFallback src={h.image} seed={h.sourceHotelId} alt={h.name} fill sizes="80px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-medium leading-tight">{h.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/60">
              <MapPin className="size-3" /> {[h.city, h.country].filter(Boolean).join(", ")}
            </p>
            {h.nightly ? (
              <p className="mt-1 text-sm">
                <span className="font-semibold text-gradient-gold">{formatCurrency(h.nightly, h.currency)}</span>
                <span className="text-xs text-foreground/55"> / night</span>
              </p>
            ) : null}
            {h.perks[0] && (
              <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-foreground/60">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={1.5} />
                {h.perks[0].replace(/\*+$/g, "")}
              </p>
            )}
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-foreground/40 transition-colors group-hover:text-primary" />
        </Link>
      ))}
    </div>
  );
}
