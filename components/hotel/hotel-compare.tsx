"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Star,
  Check,
  X,
  Loader2,
  CalendarDays,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { AMENITY_META } from "./amenity-meta";
import { useCompareRates } from "@/hooks/use-hotels";
import { cn, formatCurrency } from "@/lib/utils";
import type { Hotel, Occasion } from "@/lib/services/types";

const BEST_FOR: Partial<Record<Occasion, string>> = {
  honeymoon: "couples",
  anniversary: "couples",
  wedding: "couples",
  family: "families",
  business: "business travellers",
  wellness: "wellness seekers",
  celebration: "celebrations",
  birthday: "celebrations",
  leisure: "leisure travellers",
};

function deriveBestFor(hotel: Hotel): string {
  if (hotel.bestFor) return hotel.bestFor;
  const set = new Set<string>();
  hotel.goodFor.forEach((g) => {
    const label = BEST_FOR[g];
    if (label) set.add(label);
  });
  const list = [...set].slice(0, 3);
  if (list.length === 0) return "Discerning travellers";
  const joined = list.join(", ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

interface Row {
  key: string;
  label: string;
  highlight?: boolean;
  visible?: boolean;
  cell: (hotel: Hotel, index: number) => ReactNode;
}

export function HotelCompare({
  hotels,
  title = "Compare similar hotels",
  subtitle = "See how this stay measures up against another exceptional option nearby — with live entry-level rates for your dates.",
}: {
  hotels: Hotel[];
  title?: string;
  subtitle?: string;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    );
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const datesValid = nights > 0;
  const rates = useCompareRates(
    hotels.map((h) => h.id),
    nights,
    datesValid,
  );

  if (hotels.length < 2) return null;

  const cols = hotels.length;
  const minWidth = 150 + cols * 230;

  const priceCell = (_: Hotel, i: number) => {
    if (!datesValid)
      return (
        <span className="text-sm text-foreground/55">Select dates →</span>
      );
    const r = rates[i];
    if (r?.isLoading)
      return <Loader2 className="size-5 animate-spin text-primary" />;
    if (r?.isError || !r?.data)
      return <span className="text-sm text-foreground/55">Unavailable</span>;
    const q = r.data.quote;
    return (
      <div>
        <div className="font-display text-2xl leading-none text-gradient-gold">
          {formatCurrency(q.nightlyRate)}
          <span className="ml-1 text-xs font-normal text-foreground/55">
            /night
          </span>
        </div>
        <div className="mt-1.5 text-xs text-foreground/65">
          {formatCurrency(q.total)} total · {nights} night{nights > 1 ? "s" : ""}
        </div>
      </div>
    );
  };

  const rows: Row[] = [
    {
      key: "price",
      label: "Entry-level rate",
      highlight: true,
      cell: priceCell,
    },
    {
      key: "stars",
      label: "Star rating",
      cell: (h) => (
        <span className="inline-flex">
          {Array.from({ length: h.starRating }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-primary text-primary" strokeWidth={1.5} />
          ))}
        </span>
      ),
    },
    {
      key: "guest",
      label: "Guest rating",
      cell: (h) => (
        <span className="text-sm">
          <span className="font-semibold">{h.rating}</span>
          <span className="text-foreground/55"> / 10 · {h.reviewCount.toLocaleString()} reviews</span>
        </span>
      ),
    },
    {
      key: "location",
      label: "Location",
      cell: (h) => (
        <span className="text-sm text-foreground/80">
          {h.neighborhood}
          <span className="block text-xs text-foreground/55">
            {h.city}, {h.country}
          </span>
        </span>
      ),
    },
    {
      key: "amenities",
      label: "Key amenities",
      cell: (h) => (
        <div className="flex flex-wrap gap-1.5">
          {h.amenities
            .map((a) => AMENITY_META[a])
            .filter(Boolean)
            .slice(0, 5)
            .map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-foreground/72"
              >
                <m.icon className="size-3 text-primary/80" strokeWidth={1.5} />
                {m.label}
              </span>
            ))}
        </div>
      ),
    },
    {
      key: "highlights",
      label: "Highlights",
      cell: (h) => (
        <ul className="space-y-1">
          {h.highlights.slice(0, 3).map((hl) => (
            <li key={hl} className="flex gap-1.5 text-xs leading-snug text-foreground/75">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
              {hl}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "usp",
      label: "Stands out for",
      cell: (h) => (
        <span className="text-sm leading-snug text-foreground/80">
          {h.usp ?? h.highlights[0]}
        </span>
      ),
    },
    {
      key: "bestfor",
      label: "Best suited for",
      cell: (h) => (
        <span className="text-sm leading-snug text-foreground/80">
          {deriveBestFor(h)}
        </span>
      ),
    },
    {
      key: "pros",
      label: "Pros",
      visible: hotels.some((h) => h.pros?.length),
      cell: (h) => (
        <ul className="space-y-1">
          {(h.pros ?? []).map((p) => (
            <li key={p} className="flex gap-1.5 text-xs leading-snug text-foreground/75">
              <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={2} />
              {p}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "cons",
      label: "Worth noting",
      visible: hotels.some((h) => h.cons?.length),
      cell: (h) => (
        <ul className="space-y-1">
          {(h.cons ?? []).map((c) => (
            <li key={c} className="flex gap-1.5 text-xs leading-snug text-foreground/60">
              <X className="mt-0.5 size-3 shrink-0 text-foreground/40" strokeWidth={2} />
              {c}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "cta",
      label: "",
      cell: (h) => (
        <Link
          href={`/hotel/${h.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View hotel
          <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
        </Link>
      ),
    },
  ];

  const visibleRows = rows.filter((r) => r.visible !== false);

  return (
    <section className="overflow-hidden rounded-3xl glass-strong shadow-card">
      {/* Header + date picker */}
      <div className="flex flex-col gap-5 border-b border-black/[0.06] p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 font-display text-2xl font-medium">
            <Sparkles className="size-5 text-primary" strokeWidth={1.5} /> {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/72">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-foreground/65">
            Check-in
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-foreground/65">
            Check-out
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      </div>

      {/* Prompt when no dates yet */}
      {!datesValid && (
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-primary/[0.04] px-6 py-3 text-sm text-foreground/72">
          <CalendarDays className="size-4 text-primary" strokeWidth={1.5} />
          Choose your check-in and check-out dates to see live entry-level rates
          for each hotel.
        </div>
      )}

      {/* Comparison grid */}
      <div className="no-scrollbar overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `minmax(120px,150px) repeat(${cols}, minmax(220px,1fr))`,
            minWidth: `${minWidth}px`,
          }}
        >
          {/* Header row */}
          <div className="p-4" />
          {hotels.map((h) => (
            <div key={h.id} className="p-4">
              <div className="relative mb-3 h-24 w-full overflow-hidden rounded-xl">
                <ImageWithFallback
                  src={h.image}
                  seed={h.id}
                  alt={h.name}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>
              {h.brand && (
                <p className="text-[10px] uppercase tracking-wider text-primary/80">
                  {h.brand}
                </p>
              )}
              <p className="font-display text-base font-medium leading-tight">
                {h.name}
              </p>
            </div>
          ))}

          {/* Metric rows */}
          {visibleRows.map((row) => (
            <Fragment key={row.key}>
              <div
                className={cn(
                  "border-t border-black/[0.06] px-4 py-4 text-[11px] font-medium uppercase tracking-wider text-foreground/55",
                  row.highlight && "bg-primary/[0.05]",
                )}
              >
                {row.label}
              </div>
              {hotels.map((h, i) => (
                <div
                  key={h.id}
                  className={cn(
                    "border-t border-black/[0.06] px-4 py-4 align-top",
                    row.highlight && "bg-primary/[0.05]",
                  )}
                >
                  {row.cell(h, i)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
