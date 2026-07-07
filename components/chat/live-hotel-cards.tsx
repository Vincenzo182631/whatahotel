"use client";

import Link from "next/link";
import { MapPin, Sparkles, Scale, Check, ArrowUpRight } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useCompareSelection } from "@/store/compare-selection-store";
import { useHotelLiveRate, useInView } from "@/hooks/use-hotel-live-rate";
import { cn, formatCurrency } from "@/lib/utils";
import type { LiveHotel } from "@/lib/services/live-rates";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function LiveHotelCard({
  h,
  checkIn = "",
  checkOut = "",
}: {
  h: LiveHotel;
  checkIn?: string;
  checkOut?: string;
}) {
  const selectedItems = useCompareSelection((s) => s.selected);
  const toggle = useCompareSelection((s) => s.toggle);
  const selected = selectedItems.some((s) => s.id === h.sourceHotelId);

  const { ref, inView } = useInView<HTMLDivElement>();
  const hasDates = Boolean(checkIn && checkOut);
  const { data: rate, isFetching } = useHotelLiveRate(
    h.sourceHotelId,
    checkIn,
    checkOut,
    hasDates && inView,
  );

  const dates = hasDates ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
  const stayHref = `/stay/${h.sourceHotelId}${dates}`;

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition-shadow",
        selected
          ? "border-primary/60 shadow-[0_8px_30px_-12px_rgba(255,56,92,0.35)]"
          : "border-black/[0.07] shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:shadow-card",
      )}
    >
      <div className="flex gap-3 p-3">
        <Link href={stayHref} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
          <ImageWithFallback src={h.image} seed={h.sourceHotelId} alt={h.name} fill sizes="96px" className="object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={stayHref} className="font-display text-sm font-semibold leading-tight text-[#1a1a1a] hover:underline">
            {h.name}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/60">
            <MapPin className="size-3" /> {[h.city, h.country].filter(Boolean).join(", ")}
          </p>

          {h.distanceLabel && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/[0.08] px-2 py-0.5 text-[11px] font-medium text-primary">
              <MapPin className="size-3" strokeWidth={2} /> {h.distanceLabel}
            </p>
          )}

          {/* Live rate */}
          {hasDates && isFetching && !rate ? (
            <div className="mt-1.5 h-6 w-28 animate-pulse rounded-md bg-black/[0.06]" />
          ) : rate ? (
            <p className="mt-1.5">
              <span className="text-xs text-foreground/60">From </span>
              <span className="text-lg font-semibold text-[#1a1a1a]">{formatCurrency(rate.nightly, rate.currency)}</span>
              <span className="text-xs text-foreground/60"> / night</span>
              <span className="ml-1 block text-[11px] text-foreground/50">
                {formatCurrency(rate.total, rate.currency)} total · Live for {fmtDate(checkIn)}–{fmtDate(checkOut)}
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-foreground/55">
              {hasDates ? "Rate on request for these dates" : "Live rates for your dates"}
            </p>
          )}

          {h.matchReason ? (
            <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-[#1a1a1a]/80">
              <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={2.5} />
              {h.matchReason}
            </p>
          ) : (
            h.perks[0] && (
              <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-foreground/60">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={1.5} />
                {h.perks[0].replace(/\*+$/g, "")}
              </p>
            )
          )}
        </div>
      </div>

      {/* Prominent actions: View hotel, then Compare */}
      <div className="space-y-2 border-t border-black/[0.05] p-3">
        <Link
          href={stayHref}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          View hotel <ArrowUpRight className="size-4" />
        </Link>
        <button
          onClick={() => toggle({ id: h.sourceHotelId, name: h.name })}
          aria-pressed={selected}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
            selected
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-black/15 text-[#1a1a1a] hover:bg-black/[0.04]",
          )}
        >
          {selected ? <Check className="size-4" /> : <Scale className="size-4" />}
          {selected ? "Comparing" : "Compare"}
        </button>
      </div>
    </div>
  );
}

/** Live API results rendered in the chat — each shows live rates and can be opened or compared. */
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
  return (
    <div className="space-y-3">
      {hotels.map((h) => (
        <LiveHotelCard key={h.sourceHotelId} h={h} checkIn={checkIn} checkOut={checkOut} />
      ))}
    </div>
  );
}
