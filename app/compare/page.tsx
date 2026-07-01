import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, Star, MapPin, Check, BedDouble, Sparkles, ArrowUpRight } from "lucide-react";
import { hotelDetailsService } from "@/lib/services";
import { getLiveRates } from "@/lib/services/live-rates";
import { AMENITY_META } from "@/components/hotel/amenity-meta";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { formatCurrency, cn } from "@/lib/utils";
import type { AdvisorPerk, Hotel } from "@/lib/services/types";

export const dynamic = "force-dynamic";

type Search = { a?: string; b?: string; checkIn?: string; checkOut?: string };
type Params = { searchParams: Promise<Search> };

export const metadata: Metadata = {
  title: "Compare hotels — WhataHotel",
};

interface Col {
  hotel: Hotel;
  live: boolean;
  currency: string;
  entryNightly: number;
  total: number;
  rooms: { name: string; nightly: number; currency: string }[];
  perks: AdvisorPerk[];
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
  };
  if (hotel.sourceHotelId && nights > 0) {
    const r = await getLiveRates({ sourceHotelId: hotel.sourceHotelId, checkIn, checkOut });
    if (r) {
      col.live = true;
      col.currency = r.currency;
      col.entryNightly = r.entryNightly;
      col.total = r.rooms[0]?.total ?? r.entryNightly * nights;
      col.rooms = r.rooms;
      if (r.perks.length) col.perks = r.perks;
    }
  }
  return col;
}

// Distance between the two hotels (real datum when both are geocoded).
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

export default async function ComparePage({ searchParams }: Params) {
  const { a, b, checkIn = "", checkOut = "" } = await searchParams;
  if (!a || !b) notFound();

  const [ha, hb] = await Promise.all([
    hotelDetailsService.getHotelById(a),
    hotelDetailsService.getHotelById(b),
  ]);
  if (!ha || !hb) notFound();

  const nights = nightsBetween(checkIn, checkOut);
  const [ca, cb] = await Promise.all([
    buildCol(ha, checkIn, checkOut, nights),
    buildCol(hb, checkIn, checkOut, nights),
  ]);
  const cols = [ca, cb];
  const anyLive = ca.live || cb.live;
  const dist = kmApart(ha, hb);

  const dateLabel =
    nights > 0
      ? `${new Date(checkIn).toLocaleDateString(undefined, { month: "short", day: "numeric" })} → ${new Date(checkOut).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${nights} night${nights > 1 ? "s" : ""}`
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
      label: "Rate for your dates",
      highlight: true,
      cell: (c) => (
        <div>
          <div className="text-2xl font-semibold text-[#FF385C]">
            {formatCurrency(c.entryNightly, c.currency)}
            <span className="ml-1 text-xs font-normal text-[#717171]">/night</span>
          </div>
          {nights > 0 && (
            <div className="mt-1 text-xs text-[#717171]">
              {formatCurrency(c.total, c.currency)} total · {nights} night{nights > 1 ? "s" : ""}
            </div>
          )}
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#FF385C]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF385C]">
            <span className="size-1.5 rounded-full bg-[#FF385C]" /> {c.live ? "Live rate" : "Indicative"}
          </div>
        </div>
      ),
    },
    {
      key: "rooms",
      label: "Room categories",
      cell: (c) =>
        c.rooms.length ? (
          <ul className="space-y-1.5">
            {c.rooms.slice(0, 6).map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 text-[#222]">
                  <BedDouble className="size-3.5 shrink-0 text-[#FF385C]/80" />
                  <span className="truncate">{r.name}</span>
                </span>
                <span className="shrink-0 font-medium text-[#717171]">{formatCurrency(r.nightly, r.currency)}</span>
              </li>
            ))}
            {c.rooms.length > 6 && <li className="text-xs text-[#9a9a9a]">+ {c.rooms.length - 6} more categories</li>}
          </ul>
        ) : (
          <span className="text-sm text-[#9a9a9a]">Room categories shown at booking</span>
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
      cell: (c) => <span className="text-sm text-[#222]">{c.hotel.brand || "Independent"}</span>,
    },
    {
      key: "location",
      label: "Location",
      cell: (c) => (
        <span className="text-sm text-[#222]">
          {c.hotel.neighborhood}
          <span className="block text-xs text-[#717171]">{c.hotel.city}, {c.hotel.country}</span>
        </span>
      ),
    },
    {
      key: "amenities",
      label: "Amenities",
      visible: cols.some((c) => c.hotel.amenities.length),
      cell: (c) => (
        <div className="flex flex-wrap gap-1.5">
          {c.hotel.amenities.map((k) => AMENITY_META[k]).filter(Boolean).slice(0, 8).map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-[#555]">
              <m.icon className="size-3 text-[#FF385C]/80" strokeWidth={1.5} /> {m.label}
            </span>
          ))}
          {!c.hotel.amenities.length && <span className="text-sm text-[#9a9a9a]">—</span>}
        </div>
      ),
    },
    {
      key: "perks",
      label: "Perks & inclusions",
      cell: (c) =>
        c.perks.length ? (
          <ul className="space-y-1">
            {c.perks.slice(0, 6).map((p) => (
              <li key={p.id} className="flex gap-1.5 text-xs leading-snug text-[#333]">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-[#FF385C]" strokeWidth={1.5} /> {p.label}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-[#9a9a9a]">—</span>
        ),
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
          <li className="text-[#9a9a9a]">Cancellation & exact check-in/out times confirmed at booking.</li>
        </ul>
      ),
    },
    {
      key: "cta",
      label: "",
      cell: (c) => (
        <Link
          href={`/hotel/${c.hotel.id}`}
          className="inline-flex items-center gap-1 rounded-full bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          View hotel <ArrowUpRight className="size-3.5" />
        </Link>
      ),
    },
  ];

  const visibleRows = rows.filter((r) => r.visible !== false);

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-[#f7f7f7]">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Side-by-side comparison</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#717171]">
          <span className="flex items-center gap-1.5"><MapPin className="size-4 text-[#FF385C]" /> {ha.city} · {dateLabel}</span>
          {dist != null && <span>· {dist} km apart</span>}
          {!anyLive && nights > 0 && <span className="text-[#E61E4D]">· live rates unavailable, showing indicative prices</span>}
        </p>

        <div className="no-scrollbar mt-6 overflow-x-auto">
          <div className="grid min-w-[640px]" style={{ gridTemplateColumns: "150px 1fr 1fr" }}>
            {/* Hotel header row */}
            <div />
            {cols.map((c) => (
              <div key={c.hotel.id} className="px-4 pb-4">
                <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl">
                  <ImageWithFallback src={c.hotel.image} seed={c.hotel.id} alt={c.hotel.name} fill sizes="320px" className="object-cover" />
                </div>
                {c.hotel.brand && <p className="text-[10px] uppercase tracking-wider text-[#FF385C]">{c.hotel.brand}</p>}
                <p className="text-base font-semibold leading-tight">{c.hotel.name}</p>
              </div>
            ))}

            {/* Metric rows */}
            {visibleRows.map((row) => (
              <div key={row.key} className="contents">
                <div className={cn("border-t border-[#EBEBEB] px-4 py-4 text-[11px] font-semibold uppercase tracking-wide text-[#717171]", row.highlight && "bg-[#FF385C]/[0.05]")}>
                  {row.label}
                </div>
                {cols.map((c) => (
                  <div key={c.hotel.id} className={cn("border-t border-[#EBEBEB] px-4 py-4 align-top", row.highlight && "bg-[#FF385C]/[0.05]")}>
                    {row.cell(c)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
