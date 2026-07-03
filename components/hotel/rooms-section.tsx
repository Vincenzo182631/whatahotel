"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  CalendarX,
  Check,
  AlertCircle,
  RotateCcw,
  Users,
  Maximize2,
  Coffee,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useConversation } from "@/store/conversation-store";
import { useTravelDates } from "@/store/travel-dates-store";
import { cn, formatCurrency } from "@/lib/utils";
import type { LiveRoom } from "@/lib/services/live-rates";

const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

type FetchResult = { status: "ok" | "error"; rooms: LiveRoom[] };

async function fetchRooms(hotelId: string, ci: string, co: string): Promise<FetchResult> {
  try {
    const res = await fetch(
      `/api/rates?id=${encodeURIComponent(hotelId)}&checkIn=${ci}&checkOut=${co}`,
    );
    if (!res.ok) return { status: "error", rooms: [] };
    const d = await res.json();
    return { status: "ok", rooms: d?.live ? (d.rooms ?? []) : [] };
  } catch {
    return { status: "error", rooms: [] };
  }
}

/* --- pull structured details out of the room description --- */
function roomSize(desc?: string): string | undefined {
  if (!desc) return undefined;
  const sqm = desc.match(/(\d[\d,]*)\s?sq\s?m/i) || desc.match(/(\d[\d,]*)\s?sm\b/i);
  const sqft = desc.match(/(\d[\d,]*)\s?sq\s?ft/i);
  if (sqm && sqft) return `${sqm[1]} m² · ${sqft[1]} ft²`;
  if (sqm) return `${sqm[1]} m²`;
  if (sqft) return `${sqft[1]} ft²`;
  return undefined;
}
function occupancy(desc?: string): number | undefined {
  const m = desc?.match(/max\.?\s*occ\w*\.?\s*(\d+)/i);
  return m ? Number(m[1]) : undefined;
}
function cancellation(desc?: string): string | undefined {
  if (!desc) return undefined;
  if (/non[-\s]?refundable/i.test(desc)) return "Non-refundable";
  if (/free cancellation|fully refundable/i.test(desc)) return "Free cancellation";
  return undefined;
}

function DetailChip({ icon: Icon, children }: { icon: typeof Users; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#717171]">
      <Icon className="size-3.5 text-[#999]" strokeWidth={1.75} /> {children}
    </span>
  );
}

export function RoomsSection({
  hotelId,
  sourceHotelId,
  perks = [],
}: {
  hotelId: string;
  sourceHotelId?: string;
  perks?: { label: string }[];
}) {
  const send = useConversation((s) => s.send);
  const router = useRouter();
  const { checkIn: storeIn, checkOut: storeOut, setDates } = useTravelDates();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [catalog, setCatalog] = useState<LiveRoom[] | null>(null);
  const [priced, setPriced] = useState<FetchResult | null>(null);
  const [pricedLoading, setPricedLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d = Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86_400_000);
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);
  const hasDates = nights > 0;

  const mealPlan = perks.some((p) => /breakfast/i.test(p.label)) ? "Breakfast included" : undefined;

  useEffect(() => {
    if (storeIn && storeOut && !checkIn && !checkOut) {
      setCheckIn(storeIn);
      setCheckOut(storeOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIn, storeOut]);
  useEffect(() => {
    if (hasDates) setDates(checkIn, checkOut);
  }, [checkIn, checkOut, hasDates, setDates]);

  // Room catalogue (real rooms + photos) — probe forward for a bookable range so
  // room types + images always render, even before dates or when sold out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const off of [30, 60, 90, 120]) {
        const r = await fetchRooms(hotelId, iso(off), iso(off + 3));
        if (cancelled) return;
        if (r.rooms.length) {
          setCatalog(r.rooms);
          return;
        }
      }
      if (!cancelled) setCatalog([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  // Live rates for the chosen dates.
  useEffect(() => {
    if (!hasDates) {
      setPriced(null);
      return;
    }
    let cancelled = false;
    setPricedLoading(true);
    fetchRooms(hotelId, checkIn, checkOut).then((r) => {
      if (!cancelled) {
        setPriced(r);
        setPricedLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hotelId, checkIn, checkOut, hasDates, retryKey]);

  const reserve = () => {
    if (sourceHotelId) {
      const qs = hasDates ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
      router.push(`/stay/${sourceHotelId}${qs}`);
      return;
    }
    send("", { type: "book", hotelIds: [hotelId] });
    router.push("/");
  };

  const field =
    "rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  // ---- resolve what to show ------------------------------------------------
  const loadingRooms = catalog === null || (hasDates && (pricedLoading || priced === null));
  const apiError = hasDates && priced?.status === "error";
  const noAvailability = hasDates && priced?.status === "ok" && priced.rooms.length === 0;
  const available = hasDates && priced?.status === "ok" && priced.rooms.length > 0;

  // Master list: available rooms (with rates) + any catalogue room types not in
  // the available set, labelled Sold Out for these dates.
  const pricedRooms = priced?.rooms ?? [];
  const pricedNames = new Set(pricedRooms.map((r) => r.name));
  const soldOut = available ? (catalog ?? []).filter((r) => !pricedNames.has(r.name)) : [];

  // Which rooms to render as cards, each with an availability flag.
  const cards: { room: LiveRoom; sold: boolean }[] = available
    ? [
        ...pricedRooms.map((room) => ({ room, sold: false })),
        ...soldOut.map((room) => ({ room, sold: true })),
      ]
    : (catalog ?? []).map((room) => ({ room, sold: false }));

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/[0.07] bg-[#fafafa] p-4">
        <div className="flex items-center gap-1.5 text-sm text-[#555]">
          <CalendarDays className="size-4 text-primary" />
          {hasDates ? "Live rates for your dates" : "Pick your dates for live rates"}
        </div>
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#717171]">Check-in</span>
            <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#717171]">Check-out</span>
            <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className={field} />
          </label>
        </div>
      </div>

      {checkIn && checkOut && !hasDates && (
        <p className="text-sm text-destructive">Check-out must be after check-in.</p>
      )}

      {/* --- states --- */}
      {loadingRooms ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-[7.5rem] animate-pulse rounded-2xl bg-black/[0.04]" />
          ))}
        </div>
      ) : apiError ? (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-black/[0.04]">
            <AlertCircle className="size-5 text-[#717171]" />
          </span>
          <p className="mt-3 text-lg font-semibold text-[#1a1a1a]">Couldn&apos;t load live rates</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#717171]">
            Something went wrong reaching the rates desk. Please try again in a moment.
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setRetryKey((k) => k + 1)}>
            <RotateCcw className="size-4" /> Try again
          </Button>
        </div>
      ) : noAvailability ? (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-black/[0.04]">
            <CalendarX className="size-5 text-[#717171]" />
          </span>
          <p className="mt-3 text-lg font-semibold text-[#1a1a1a]">Not Available</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#717171]">
            This hotel has no available rooms for your selected dates. Please try different dates or another hotel.
          </p>
        </div>
      ) : cards.length === 0 ? (
        <p className="rounded-2xl border border-black/[0.08] bg-white p-6 text-sm text-[#717171]">
          Room details are confirmed at booking — ask the advisor and I&apos;ll pull them up.
        </p>
      ) : null}

      {/* Room cards — available rooms (with sold-out types), or the catalogue before dates */}
      {!loadingRooms && !apiError && !noAvailability && (available || !hasDates) &&
        cards.map(({ room, sold }) => {
          const size = roomSize(room.description);
          const occ = occupancy(room.description);
          const cancel = cancellation(room.description);
          return (
            <div
              key={room.name}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border p-4 transition-shadow sm:flex-row sm:items-stretch sm:justify-between",
                sold
                  ? "border-black/[0.06] bg-[#fafafa] opacity-80"
                  : "border-black/[0.07] bg-white hover:shadow-[0_10px_30px_-18px_rgba(16,24,40,0.25)]",
              )}
            >
              <div className="flex min-w-0 gap-4">
                {room.image ? (
                  <div className="relative size-24 shrink-0 self-start overflow-hidden rounded-xl bg-black/[0.04]">
                    <ImageWithFallback src={room.image} seed={room.name} alt={room.name} fill sizes="96px" className="object-cover" />
                    {sold && <span className="absolute inset-0 bg-white/40" />}
                  </div>
                ) : (
                  <div className="grid size-24 shrink-0 self-start place-items-center rounded-xl bg-black/[0.04] text-[#999]">
                    <BedDouble className="size-7" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-lg font-medium text-[#1a1a1a]">{room.name}</h4>
                    {sold && (
                      <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#717171]">
                        Sold out
                      </span>
                    )}
                  </div>
                  {room.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-[#717171]">{room.description}</p>
                  )}
                  {/* detail chips */}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                    {room.bedType && <DetailChip icon={BedDouble}>{room.bedType}</DetailChip>}
                    {occ && <DetailChip icon={Users}>Sleeps {occ}</DetailChip>}
                    {size && <DetailChip icon={Maximize2}>{size}</DetailChip>}
                    {cancel && <DetailChip icon={ShieldCheck}>{cancel}</DetailChip>}
                    {mealPlan && <DetailChip icon={Coffee}>{mealPlan}</DetailChip>}
                    {perks.length > 0 && <DetailChip icon={Sparkles}>Advisor perks incl.</DetailChip>}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end sm:justify-between">
                <div className="text-right">
                  {sold ? (
                    <p className="text-sm font-medium text-[#9a9a9a]">Sold out for your dates</p>
                  ) : available && room.nightly ? (
                    <>
                      <p className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
                        {formatCurrency(room.nightly, room.currency)}
                        <span className="text-xs font-normal text-[#717171]"> / night</span>
                      </p>
                      {room.total ? (
                        <p className="text-xs text-[#9a9a9a]">
                          {formatCurrency(room.total, room.currency)} total · {nights} night{nights > 1 ? "s" : ""}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-[#1a1a1a]">Live rate for your dates</p>
                      <p className="text-xs text-[#9a9a9a]">Pick dates above</p>
                    </>
                  )}
                </div>
                {!sold && (
                  <Button size="sm" onClick={reserve}>
                    <Check className="size-4" /> Reserve
                  </Button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
