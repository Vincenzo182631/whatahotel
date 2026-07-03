"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Sparkles, Scale, Check } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useCompareSelection } from "@/store/compare-selection-store";
import { cn } from "@/lib/utils";
import type { LiveHotel } from "@/lib/services/live-rates";

/** Live API results rendered in the chat — each can be opened or selected to compare. */
export function LiveHotelCards({
  hotels,
  checkIn,
  checkOut,
}: {
  hotels: LiveHotel[];
  checkIn?: string;
  checkOut?: string;
}) {
  // Subscribe to the selection array (not the stable isSelected fn) so cards
  // re-render when the selection changes.
  const selectedItems = useCompareSelection((s) => s.selected);
  const toggle = useCompareSelection((s) => s.toggle);

  if (!hotels.length) return null;
  const dates = checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";

  return (
    <div className="space-y-3">
      {hotels.map((h) => {
        const selected = selectedItems.some((s) => s.id === h.sourceHotelId);
        return (
          <div
            key={h.sourceHotelId}
            className={cn(
              "rounded-2xl border bg-white transition-shadow",
              selected
                ? "border-primary/60 shadow-[0_8px_30px_-12px_rgba(255,56,92,0.35)]"
                : "border-black/[0.07] shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:shadow-card",
            )}
          >
            <Link
              href={`/stay/${h.sourceHotelId}${dates}`}
              className="group flex gap-3 p-3"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                <ImageWithFallback src={h.image} seed={h.sourceHotelId} alt={h.name} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-medium leading-tight">{h.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/60">
                  <MapPin className="size-3" /> {[h.city, h.country].filter(Boolean).join(", ")}
                </p>
                <p className="mt-1 text-xs text-foreground/55">Live rates for your dates</p>
                {h.perks[0] && (
                  <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-foreground/60">
                    <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={1.5} />
                    {h.perks[0].replace(/\*+$/g, "")}
                  </p>
                )}
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-foreground/40 transition-colors group-hover:text-primary" />
            </Link>

            {/* Select-to-compare */}
            <div className="flex items-center justify-end border-t border-black/[0.05] px-3 py-2">
              <button
                onClick={() => toggle({ id: h.sourceHotelId, name: h.name })}
                aria-pressed={selected}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/60 hover:bg-black/[0.04] hover:text-foreground",
                )}
              >
                {selected ? <Check className="size-4" /> : <Scale className="size-4" />}
                {selected ? "Comparing" : "Compare"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
