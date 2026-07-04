"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star,
  Heart,
  Scale,
  Sparkles,
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { AMENITY_META } from "./amenity-meta";
import { cn, formatCurrency } from "@/lib/utils";
import { usePreferences } from "@/store/preferences-store";
import { useCompareSelection } from "@/store/compare-selection-store";
import { useHotelLiveRate } from "@/hooks/use-hotel-live-rate";
import type { Recommendation } from "@/lib/services/types";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function matchLabel(score: number) {
  if (score >= 9) return "Excellent match";
  if (score >= 8) return "Great match";
  return "Good match";
}

export function HotelCard({
  hotel,
  index = 0,
  checkIn = "",
  checkOut = "",
}: {
  hotel: Recommendation;
  index?: number;
  checkIn?: string;
  checkOut?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSaved = usePreferences((s) => s.isSaved(hotel.id));
  const toggleSave = usePreferences((s) => s.toggleSave);
  const compareSelected = useCompareSelection((s) => s.isSelected(hotel.id));
  const toggleCompare = useCompareSelection((s) => s.toggle);

  const hasDates = Boolean(checkIn && checkOut);
  const { data: rate, isFetching } = useHotelLiveRate(hotel.id, checkIn, checkOut, hasDates);

  const amenities = hotel.amenities
    .map((a) => AMENITY_META[a])
    .filter(Boolean)
    .slice(0, 4);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition-shadow duration-300",
        compareSelected
          ? "border-primary/60 shadow-[0_8px_30px_-12px_rgba(255,56,92,0.35)]"
          : "border-black/[0.07] shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:shadow-[0_18px_40px_-20px_rgba(16,24,40,0.28)]",
      )}
    >
      <div className="grid sm:grid-cols-[13.5rem_1fr]">
        {/* Image */}
        <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full">
          <ImageWithFallback
            src={hotel.image}
            seed={hotel.id}
            alt={hotel.name}
            fill
            sizes="(max-width: 640px) 100vw, 220px"
            className="object-cover"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-[#222] shadow-sm backdrop-blur">
            #{hotel.rank}
            <span className="text-[#717171]">·</span>
            <span className="text-primary">{hotel.fitScore.toFixed(1)}</span>
          </span>
          <button
            onClick={() => toggleSave(hotel)}
            aria-label={isSaved ? "Remove from saved" : "Save hotel"}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/92 text-[#222] shadow-sm backdrop-blur transition-transform hover:scale-105"
          >
            <Heart className={cn("size-4", isSaved && "fill-primary text-primary")} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3.5 p-5">
          {/* Name + rating */}
          <div>
            {hotel.brand && (
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a]">
                {hotel.brand}
              </p>
            )}
            <div className="mt-1 flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold leading-snug tracking-tight text-[#1a1a1a]">
                {hotel.name}
              </h3>
              <span className="mt-1 flex shrink-0 items-center gap-0.5">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-[#1a1a1a] text-[#1a1a1a]" strokeWidth={0} />
                ))}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-[#717171]">
              <MapPin className="size-3.5" /> {hotel.city}, {hotel.country}
            </p>
          </div>

          {/* Match (quiet) */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <Sparkles className="size-3.5 text-primary" strokeWidth={2} />
            <span className="font-medium text-[#1a1a1a]">{matchLabel(hotel.fitScore)}</span>
            <span className="text-[#9a9a9a]">· {hotel.fitScore.toFixed(1)}/10</span>
          </div>

          {/* Price hero */}
          <div>
            {hasDates ? (
              isFetching && !rate ? (
                <div className="h-9 w-32 animate-pulse rounded-lg bg-black/[0.06]" />
              ) : rate ? (
                <>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">
                      {formatCurrency(rate.nightly, rate.currency)}
                    </span>
                    <span className="text-sm text-[#717171]">/ night</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[#9a9a9a]">
                    {formatCurrency(rate.total, rate.currency)} total · taxes incl · Live for {fmtDate(checkIn)}–{fmtDate(checkOut)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#717171]">Rate on request for these dates</p>
              )
            ) : (
              <>
                <p className="text-lg font-semibold text-[#1a1a1a]">Live rates for your dates</p>
                <p className="mt-0.5 text-xs text-[#9a9a9a]">Add dates to see pricing · advisor perks included</p>
              </>
            )}
          </div>

          {/* Why we picked (quiet card, progressive disclosure) */}
          <div className="rounded-xl bg-black/[0.025] p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#717171]">
              <Sparkles className="size-3 text-primary" /> Why your advisor recommends this
            </p>
            <p className={cn("mt-1.5 text-sm leading-relaxed text-[#444]", !expanded && "line-clamp-2")}>
              {hotel.reason}
            </p>

            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 space-y-2 border-t border-black/[0.06] pt-3"
              >
                <ul className="space-y-1.5">
                  {hotel.perks.slice(0, 4).map((perk) => (
                    <li key={perk.id} className="flex items-start gap-2 text-[13px] text-[#555]">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2} />
                      <span>{perk.label}</span>
                    </li>
                  ))}
                </ul>
                {hotel.distances.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-[#9a9a9a]">
                    {hotel.distances.map((d) => (
                      <span key={d.label}>
                        {d.label}: <span className="text-[#555]">{d.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          </div>

          {/* Amenities (inline dots) */}
          {amenities.length > 0 && (
            <p className="text-[13px] text-[#717171]">
              {amenities.map((a) => a.label).join("  •  ")}
            </p>
          )}

          {/* Actions */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button size="sm" asChild>
              <Link href={`/hotel/${hotel.id}`}>Book now</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/hotel/${hotel.id}`}>View details</Link>
            </Button>
            <button
              onClick={() => toggleCompare({ id: hotel.id, name: hotel.name })}
              aria-pressed={compareSelected}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                compareSelected
                  ? "bg-primary/10 text-primary"
                  : "text-[#717171] hover:bg-black/[0.04] hover:text-[#222]",
              )}
            >
              {compareSelected ? <Check className="size-4" /> : <Scale className="size-4" />}
              {compareSelected ? "Comparing" : "Compare"}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
