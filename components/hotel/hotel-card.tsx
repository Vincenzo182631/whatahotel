"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star,
  Heart,
  Scale,
  CalendarCheck,
  Sparkles,
  MapPin,
  ChevronRight,
  Gift,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { AMENITY_META } from "./amenity-meta";
import { cn, formatCurrency } from "@/lib/utils";
import { useConversation } from "@/store/conversation-store";
import { usePreferences } from "@/store/preferences-store";
import { useCompareSelection } from "@/store/compare-selection-store";
import { useHotelLiveRate } from "@/hooks/use-hotel-live-rate";
import type { Recommendation } from "@/lib/services/types";

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
  const [showWhy, setShowWhy] = useState(false);
  const send = useConversation((s) => s.send);
  const isStreaming = useConversation((s) => s.isStreaming);
  const isSaved = usePreferences((s) => s.isSaved(hotel.id));
  const toggleSave = usePreferences((s) => s.toggleSave);
  const compareSelected = useCompareSelection((s) => s.isSelected(hotel.id));
  const toggleCompare = useCompareSelection((s) => s.toggle);
  // Live rate for the traveller's dates — the same method=rates the stay page uses.
  const { data: rate } = useHotelLiveRate(hotel.id, checkIn, checkOut, Boolean(checkIn && checkOut));

  const amenities = hotel.amenities
    .map((a) => AMENITY_META[a])
    .filter(Boolean)
    .slice(0, 5);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group overflow-hidden rounded-3xl glass-strong shadow-card transition-shadow",
        compareSelected && "ring-2 ring-primary",
      )}
    >
      <div className="grid md:grid-cols-[300px_1fr]">
        {/* Image */}
        <div className="relative h-56 md:h-full min-h-[240px] overflow-hidden">
          <ImageWithFallback
            src={hotel.image}
            seed={hotel.id}
            alt={hotel.name}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-navy-900/30" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-gold-sheen text-sm font-semibold text-white shadow-lg">
              #{hotel.rank}
            </span>
            <Badge variant="gold" className="shadow-lg">
              <Sparkles className="size-3" /> {hotel.fitScore.toFixed(1)}/10 match
            </Badge>
          </div>
          <button
            onClick={() => toggleSave(hotel)}
            aria-label={isSaved ? "Remove from saved" : "Save hotel"}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full glass transition-colors hover:text-primary"
          >
            <Heart
              className={cn("size-4", isSaved && "fill-primary text-primary")}
            />
          </button>
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-xs text-cream/90">
            <MapPin className="size-3.5 text-primary" />
            {hotel.neighborhood}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {hotel.brand && (
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary/80">
                  {hotel.brand}
                </p>
              )}
              <h3 className="mt-1 font-display text-2xl font-medium leading-tight">
                {hotel.name}
              </h3>
              <p className="mt-0.5 text-sm text-foreground/72">
                {hotel.city}, {hotel.country}
              </p>
            </div>
            {hotel.rating > 0 ? (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-sm">
                <Star className="size-3.5 fill-primary text-primary" />
                <span className="font-semibold">{hotel.rating}</span>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-black/[0.04] px-2.5 py-1">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="size-3 fill-primary text-primary" strokeWidth={1.5} />
                ))}
              </div>
            )}
          </div>

          {/* AI reasoning */}
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary/90">
              <Sparkles className="size-3" /> Why your advisor chose this
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
              {hotel.reason}
            </p>
          </div>

          {/* Amenities */}
          <div className="mt-4 flex flex-wrap gap-2">
            {amenities.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-foreground/70"
              >
                <Icon className="size-3.5 text-primary/80" />
                {label}
              </span>
            ))}
          </div>

          {/* Perks (expandable) */}
          {showWhy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 space-y-2 overflow-hidden"
            >
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Gift className="size-3.5" /> Advisor-exclusive perks
              </p>
              <ul className="space-y-1.5">
                {hotel.perks.map((perk) => (
                  <li
                    key={perk.id}
                    className="flex items-start gap-2 text-sm text-foreground/75"
                  >
                    <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                    <span>
                      <span className="text-foreground">{perk.label}</span> —{" "}
                      {perk.detail}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-foreground/70">
                {hotel.distances.map((d) => (
                  <span key={d.label}>
                    {d.label}: <span className="text-foreground/75">{d.value}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-foreground/65">
                Rate
              </p>
              {rate ? (
                <>
                  <p className="font-display text-2xl text-gradient-gold">
                    {formatCurrency(rate.nightly, rate.currency)}
                    <span className="ml-1 text-sm font-normal text-foreground/65">/ night</span>
                  </p>
                  <p className="text-xs text-foreground/65">
                    {formatCurrency(rate.total, rate.currency)} total · advisor perks incl.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg text-gradient-gold">
                    Live rates for your dates
                  </p>
                  <p className="text-xs text-foreground/65">Advisor perks included</p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href={`/hotel/${hotel.id}`}>
                <CalendarCheck className="size-4" /> View details
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isStreaming}
              onClick={() => send("", { type: "book", hotelIds: [hotel.id] })}
            >
              Book now
            </Button>
            <Button
              size="sm"
              variant={compareSelected ? "default" : "outline"}
              onClick={() => toggleCompare({ id: hotel.id, name: hotel.name })}
              aria-pressed={compareSelected}
            >
              {compareSelected ? (
                <>
                  <Check className="size-4" /> Selected
                </>
              ) : (
                <>
                  <Scale className="size-4" /> Compare
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowWhy((v) => !v)}
            >
              {showWhy ? "Hide" : "Perks & details"}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
