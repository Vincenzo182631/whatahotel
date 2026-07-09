import Link from "next/link";
import type { ReactNode } from "react";
import { Star, MapPin, Check, Sparkles, ArrowUpRight, UtensilsCrossed } from "lucide-react";
import { hotelDetailsService } from "@/lib/services";
import { getLiveRates, getHotelInfo, getLiveHotel, type HotelInfo } from "@/lib/services/live-rates";
import { usdPerUnit } from "@/lib/services/fx";
import { HotelGallery } from "@/components/ui/hotel-gallery";
import { CompareAdvisor } from "@/components/compare/compare-advisor";
import { CompareVoiceButton } from "@/components/compare/compare-voice-button";
import { formatCurrency, cn, formatDate } from "@/lib/utils";
import { splitPerks } from "@/lib/perks";
import type { AdvisorPerk, Hotel } from "@/lib/services/types";

/**
 * Shared side-by-side comparison — resolves 2–3 hotels (local slug OR live
 * WhataHotel id), pulls LIVE rates + info for the given dates, and renders the
 * comparison grid plus the AI advisor. Used by /compare and by agent offers
 * (/offer/[id]). Rates are always fetched fresh for the dates, so the same link
 * shows today's real pricing every time it's opened.
 */

// Detect the brand / collection from a hotel name — live-only hotels don't carry
// a brand field, so we recognise the well-known luxury flags in the name.
const BRAND_PATTERNS: [RegExp, string][] = [
  [/ritz[- ]carlton reserve/i, "Ritz-Carlton Reserve"],
  [/ritz[- ]carlton/i, "Ritz-Carlton"],
  [/four seasons/i, "Four Seasons"],
  [/mandarin oriental/i, "Mandarin Oriental"],
  [/rosewood/i, "Rosewood"],
  [/st\.?\s?regis/i, "St. Regis"],
  [/waldorf astoria/i, "Waldorf Astoria"],
  [/jw marriott/i, "JW Marriott"],
  [/park hyatt/i, "Park Hyatt"],
  [/grand hyatt/i, "Grand Hyatt"],
  [/hyatt regency/i, "Hyatt Regency"],
  [/\bandaz\b/i, "Andaz"],
  [/intercontinental/i, "InterContinental"],
  [/fairmont/i, "Fairmont"],
  [/sofitel/i, "Sofitel"],
  [/raffles/i, "Raffles"],
  [/belmond/i, "Belmond"],
  [/aman(?:puri|kila|jena|resorts)?\b/i, "Aman"],
  [/one\s?&\s?only|one and only/i, "One&Only"],
  [/six senses/i, "Six Senses"],
  [/banyan tree/i, "Banyan Tree"],
  [/anantara/i, "Anantara"],
  [/kempinski/i, "Kempinski"],
  [/shangri-?la/i, "Shangri-La"],
  [/conrad/i, "Conrad"],
  [/westin/i, "Westin"],
  [/le m[eé]ridien/i, "Le Méridien"],
  [/autograph collection/i, "Autograph Collection"],
  [/luxury collection/i, "The Luxury Collection"],
  [/\boberoi\b/i, "Oberoi"],
  [/peninsula/i, "The Peninsula"],
  [/b[vu]lgari/i, "Bulgari"],
  [/cheval blanc/i, "Cheval Blanc"],
  [/nobu/i, "Nobu"],
  [/singita/i, "Singita"],
  [/and\s?beyond/i, "andBeyond"],
  [/gran mel[ií]a|mel[ií]a/i, "Meliá"],
  [/m[öo]venpick/i, "Mövenpick"],
  [/renaissance/i, "Renaissance"],
  [/sheraton/i, "Sheraton"],
  [/^w\s+\S/i, "W Hotels"],
  [/marriott/i, "Marriott"],
];
function detectBrand(name?: string): string | undefined {
  const n = (name || "").trim();
  for (const [re, b] of BRAND_PATTERNS) if (re.test(n)) return b;
  return undefined;
}

interface Col {
  hotel: Hotel;
  live: boolean;
  currency: string;
  /** USD per 1 unit of `currency`, when it isn't USD — for an approx conversion. */
  usdRate?: number;
  entryNightly: number;
  total: number;
  rooms: {
    name: string;
    nightly: number;
    currency: string;
    image?: string;
    images?: string[];
    bedType?: string;
    description?: string;
  }[];
  perks: AdvisorPerk[];
  info: HotelInfo | null;
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
  return d > 0 ? d : 0;
}

async function buildCol(hotel: Hotel, checkIn: string, checkOut: string, nights: number): Promise<Col> {
  const col: Col = {
    hotel,
    live: false,
    currency: "USD",
    entryNightly: hotel.startingRate,
    total: hotel.startingRate * Math.max(1, nights),
    rooms: [],
    perks: hotel.perks,
    info: null,
  };
  const r =
    hotel.sourceHotelId && nights > 0
      ? await getLiveRates({ sourceHotelId: hotel.sourceHotelId, checkIn, checkOut })
      : null;
  const info = await getHotelInfo(hotel.name, hotel.city);
  if (r) {
    col.live = true;
    col.currency = r.currency;
    col.entryNightly = r.entryNightly;
    col.total = r.rooms[0]?.total ?? r.entryNightly * nights;
    col.rooms = r.rooms;
    if (r.perks.length) col.perks = r.perks;
  }
  col.info = info;
  // The source has no truly per-room photography: it returns the SAME room-photo
  // set for every category (plus the hotel's generic gallery shots). So instead of
  // repeating one picture down every row — or blanking most rooms by de-duping —
  // pool the distinct room photos once (excluding the hotel-gallery images already
  // in the header), then give every room the full pool ROTATED, so each category
  // shows a photo and the thumbnails vary row to row. Clicking still opens them all.
  const hotelPhotos = new Set([hotel.image, ...(hotel.gallery ?? [])].filter(Boolean));
  const roomPool = [...new Set(col.rooms.flatMap((rm) => rm.images ?? []).filter((u): u is string => Boolean(u) && !hotelPhotos.has(u)))];
  // Never blank every room: if excluding the header shots left nothing, fall back
  // to the raw room images.
  const pool = roomPool.length ? roomPool : [...new Set(col.rooms.flatMap((rm) => rm.images ?? []).filter((u): u is string => Boolean(u)))];
  col.rooms = col.rooms.map((rm, i) => {
    if (!pool.length) return { ...rm, images: [], image: undefined };
    const off = i % pool.length;
    const rotated = [...pool.slice(off), ...pool.slice(0, off)];
    return { ...rm, images: rotated, image: rotated[0] };
  });
  if (col.currency && col.currency.toUpperCase() !== "USD") {
    const rate = await usdPerUnit(col.currency).catch(() => null);
    if (rate) col.usdRate = rate;
  }
  return col;
}

/** "≈ $1,234" when the column's currency isn't USD (approximate conversion). */
function usdApprox(c: Col, amount: number): string | null {
  if (!c.usdRate || !amount) return null;
  return `≈ ${formatCurrency(Math.round(amount * c.usdRate), "USD")}`;
}

/** Resolve an id to a Hotel — local slug via the catalogue, else a live id. */
export async function resolveComparisonHotel(id: string): Promise<Hotel | null> {
  const local = await hotelDetailsService.getHotelById(id);
  if (local) return local;
  const live = await getLiveHotel(id);
  if (!live) return null;
  return {
    id: live.sourceHotelId,
    sourceHotelId: live.sourceHotelId,
    name: live.name,
    city: live.city,
    destinationKey: "",
    country: live.country,
    neighborhood: live.address || live.city,
    shortPitch: "",
    description: "",
    image: live.image,
    gallery: live.gallery,
    rating: 0,
    reviewCount: 0,
    starRating: 0,
    startingRate: 0,
    currency: "USD",
    amenities: [],
    highlights: [],
    perks: live.perks.map((p, i) => ({ id: `p${i}`, label: p, detail: "" })),
    vibes: [],
    goodFor: [],
    distances: [],
    coordinates: live.coordinates ?? { lat: 0, lng: 0 },
    bookingUrl: live.bookingUrl,
  };
}

function kmApart(a: Hotel, b: Hotel): number | null {
  const c1 = a.coordinates, c2 = b.coordinates;
  if (!c1?.lat || !c2?.lat) return null;
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(c2.lat - c1.lat), dLng = toRad(c2.lng - c1.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

export async function ComparisonView({
  hotelIds,
  checkIn = "",
  checkOut = "",
}: {
  hotelIds: string[];
  checkIn?: string;
  checkOut?: string;
}) {
  const resolved = await Promise.all(hotelIds.slice(0, 3).map((id) => resolveComparisonHotel(id)));
  const hotels = resolved.filter((h): h is Hotel => Boolean(h));
  if (hotels.length < 2) {
    return (
      <p className="mt-6 rounded-2xl border border-[#EBEBEB] bg-[#fafafa] p-6 text-sm text-[#717171]">
        We couldn&apos;t load these hotels right now. Please refresh, or contact your advisor.
      </p>
    );
  }
  const ha = hotels[0];
  const nights = nightsBetween(checkIn, checkOut);
  const cols: Col[] = [];
  for (const h of hotels) cols.push(await buildCol(h, checkIn, checkOut, nights));
  const anyLive = cols.some((col) => col.live);
  const dist = hotels.length === 2 ? kmApart(hotels[0], hotels[1]) : null;

  const dateLabel =
    nights > 0
      ? `${formatDate(checkIn)} → ${formatDate(checkOut, { month: "short", day: "numeric", year: "numeric" })} · ${nights} night${nights > 1 ? "s" : ""}`
      : "Select dates for live pricing";

  interface Row {
    key: string;
    label: string;
    highlight?: boolean;
    visible?: boolean;
    cell: (c: Col) => ReactNode;
  }

  const rows: Row[] = [
    {
      key: "price",
      label: "Entry-level rate for your dates",
      highlight: true,
      cell: (c) =>
        c.live && c.entryNightly > 0 ? (
          <div>
            <div className="text-2xl font-semibold text-[#FF385C]">
              {formatCurrency(c.entryNightly, c.currency)}
              <span className="ml-1 text-xs font-normal text-[#717171]">/night</span>
            </div>
            {usdApprox(c, c.entryNightly) && (
              <div className="text-xs text-[#717171]">{usdApprox(c, c.entryNightly)} / night</div>
            )}
            {nights > 0 && (
              <div className="mt-1 text-xs text-[#717171]">
                {formatCurrency(c.total, c.currency)} total{usdApprox(c, c.total) ? ` (${usdApprox(c, c.total)})` : ""} · {nights} night{nights > 1 ? "s" : ""}
              </div>
            )}
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#FF385C]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF385C]">
              <span className="size-1.5 rounded-full bg-[#FF385C]" /> Live rate
            </div>
          </div>
        ) : (
          <span className="text-sm text-[#9a9a9a]">
            {nights > 0 ? "Rate on request for these dates" : "Select dates for live pricing"}
          </span>
        ),
    },
    {
      key: "stars",
      label: "Class",
      cell: (c) => (
        <span className="inline-flex">
          {Array.from({ length: c.hotel.starRating }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-[#FF385C] text-[#FF385C]" strokeWidth={1.5} />
          ))}
        </span>
      ),
    },
    {
      key: "guest",
      label: "Guest rating",
      visible: cols.some((c) => c.hotel.rating > 0),
      cell: (c) =>
        c.hotel.rating > 0 ? (
          <span className="text-sm">
            <span className="font-semibold">{c.hotel.rating}</span>
            <span className="text-[#717171]"> / 10 · {c.hotel.reviewCount.toLocaleString()} reviews</span>
          </span>
        ) : (
          <span className="text-sm text-[#9a9a9a]">—</span>
        ),
    },
    {
      key: "brand",
      label: "Brand / collection",
      cell: (c) => <span className="text-sm text-[#222]">{c.hotel.brand || detectBrand(c.hotel.name) || "Independent"}</span>,
    },
    {
      key: "location",
      label: "Location",
      cell: (c) => (
        <span className="text-sm text-[#222]">
          {c.hotel.neighborhood}
          <span className="block text-xs text-[#717171]">{c.hotel.city}, {c.hotel.country}</span>
          {c.info?.description && (
            <span className="mt-1.5 block text-xs leading-snug text-[#717171]">
              {c.info.description.length > 180 ? c.info.description.slice(0, 180) + "…" : c.info.description}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "dining",
      label: "Dining",
      visible: cols.some((c) => c.info?.restaurants.length),
      cell: (c) =>
        c.info?.restaurants.length ? (
          <ul className="space-y-1">
            {c.info.restaurants.slice(0, 5).map((r) => (
              <li key={r} className="flex gap-1.5 text-xs leading-snug text-[#555]">
                <UtensilsCrossed className="mt-0.5 size-3 shrink-0 text-[#FF385C]/80" strokeWidth={1.5} /> {r}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-[#9a9a9a]">—</span>
        ),
    },
    {
      key: "nearby",
      label: "Nearby",
      visible: cols.some((c) => c.info?.attractions.length),
      cell: (c) =>
        c.info?.attractions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {c.info.attractions.slice(0, 6).map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-[#555]">
                <MapPin className="size-3 text-[#FF385C]/80" strokeWidth={2} /> {a}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-[#9a9a9a]">—</span>
        ),
    },
    {
      key: "perks",
      label: "Exclusive Complimentary Perks",
      cell: (c) => {
        const { perks: items, conditions } = splitPerks(c.perks);
        if (!items.length && !conditions.length) return <span className="text-sm text-[#9a9a9a]">—</span>;
        return (
          <div>
            <ul className="space-y-1">
              {items.map((p) => (
                <li key={p} className="flex gap-1.5 text-xs leading-snug text-[#333]">
                  <Sparkles className="mt-0.5 size-3 shrink-0 text-[#FF385C]" strokeWidth={1.5} /> {p}
                </li>
              ))}
            </ul>
            {conditions.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 border-t border-black/[0.06] pt-1.5">
                {conditions.map((cond) => (
                  <li key={cond} className="text-[10px] leading-snug text-[#9a9a9a]">{cond}</li>
                ))}
              </ul>
            )}
          </div>
        );
      },
    },
    {
      key: "highlights",
      label: "Highlights",
      visible: cols.some((c) => c.hotel.highlights.length),
      cell: (c) => (
        <ul className="space-y-1">
          {c.hotel.highlights.slice(0, 3).map((h) => (
            <li key={h} className="flex gap-1.5 text-xs leading-snug text-[#555]">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#FF385C]" /> {h}
            </li>
          ))}
          {!c.hotel.highlights.length && <span className="text-sm text-[#9a9a9a]">—</span>}
        </ul>
      ),
    },
    {
      key: "policies",
      label: "Good to know",
      cell: (c) => (
        <ul className="space-y-1 text-xs text-[#555]">
          <li className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-[#FF385C]" /> Advisor-exclusive rate & perks</li>
          <li className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-[#FF385C]" /> Best available rate for your dates</li>
          {(c.info?.policies ?? []).slice(0, 2).map((p) => (
            <li key={p} className="text-[#9a9a9a]">{p.length > 150 ? p.slice(0, 150) + "…" : p}</li>
          ))}
          {c.info?.tax && (
            <li className="text-[#9a9a9a]">{c.info.tax.length > 140 ? c.info.tax.slice(0, 140) + "…" : c.info.tax}</li>
          )}
          <li className="text-[#9a9a9a]">Cancellation & exact check-in/out times confirmed at booking.</li>
        </ul>
      ),
    },
    {
      key: "cta",
      label: "",
      cell: (c) => (
        <Link
          href={
            c.hotel.destinationKey
              ? `/hotel/${c.hotel.id}`
              : `/stay/${c.hotel.id}${nights > 0 ? `?checkIn=${checkIn}&checkOut=${checkOut}` : ""}`
          }
          className="inline-flex items-center gap-1 rounded-full bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          View & book <ArrowUpRight className="size-3.5" />
        </Link>
      ),
    },
  ];

  const visibleRows = rows.filter((r) => r.visible !== false);

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#717171]">
          <span className="flex items-center gap-1.5"><MapPin className="size-4 text-[#FF385C]" /> {ha.city} · {dateLabel}</span>
          {dist != null && <span>· {dist} km apart</span>}
          {anyLive && nights > 0 && <span className="text-[#9a9a9a]">· live rates as of today</span>}
          {!anyLive && nights > 0 && <span className="text-[#E61E4D]">· live rates unavailable for these dates — shown as rate on request</span>}
        </p>
        {/* Live voice call, grounded in THIS comparison */}
        <CompareVoiceButton hotelIds={hotelIds.slice(0, 3)} checkIn={checkIn} checkOut={checkOut} />
      </div>

      <CompareAdvisor
        hotels={cols.map((c) => ({ id: c.hotel.id, name: c.hotel.name }))}
        checkIn={checkIn}
        checkOut={checkOut}
      />

      {/* Swipeable side-by-side comparison: slide hotels horizontally while the
          label column stays pinned. On desktop the columns fit, so nothing
          scrolls and the sticky/snap become no-ops — desktop is unchanged. */}
      <div
        className="no-scrollbar mt-6 overflow-x-auto snap-x snap-proximity"
        style={{ scrollPaddingLeft: "clamp(112px, 30vw, 150px)" }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `clamp(112px, 30vw, 150px) repeat(${cols.length}, minmax(240px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-10 bg-white" />
          {cols.map((c) => {
            const photos = [...new Set([c.hotel.image, ...(c.hotel.gallery ?? [])].filter(Boolean))];
            return (
              <div key={c.hotel.id} className="snap-start px-3 pb-4 sm:px-4">
                {/* Hero + thumbnail grid — tap any (incl. "+N") to browse ALL photos */}
                <HotelGallery images={photos} seed={`${c.hotel.id}-g`} alt={c.hotel.name} />
                {c.hotel.brand && <p className="text-[10px] uppercase tracking-wider text-[#FF385C]">{c.hotel.brand}</p>}
                <p className="text-base font-semibold leading-tight">{c.hotel.name}</p>
              </div>
            );
          })}

          {visibleRows.map((row) => (
            <div key={row.key} className="contents">
              <div
                className={cn(
                  "sticky left-0 z-10 border-t border-[#EBEBEB] px-3 py-4 text-[11px] font-semibold uppercase tracking-wide text-[#717171] sm:px-4",
                  row.highlight ? "bg-[#fdecef]" : "bg-white",
                )}
              >
                {row.label}
              </div>
              {cols.map((c) => (
                <div key={c.hotel.id} className={cn("snap-start border-t border-[#EBEBEB] px-3 py-4 align-top sm:px-4", row.highlight && "bg-[#FF385C]/[0.05]")}>
                  {row.cell(c)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
