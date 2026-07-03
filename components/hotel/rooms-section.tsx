"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CalendarDays, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useConversation } from "@/store/conversation-store";
import { useTravelDates } from "@/store/travel-dates-store";
import { formatCurrency } from "@/lib/utils";
import type { LiveRoom } from "@/lib/services/live-rates";

const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

async function fetchRooms(hotelId: string, ci: string, co: string): Promise<LiveRoom[]> {
  try {
    const d = await fetch(
      `/api/rates?id=${encodeURIComponent(hotelId)}&checkIn=${ci}&checkOut=${co}`,
    ).then((r) => (r.ok ? r.json() : null));
    return d?.live ? (d.rooms ?? []) : [];
  } catch {
    return [];
  }
}

export function RoomsSection({
  hotelId,
  sourceHotelId,
}: {
  hotelId: string;
  sourceHotelId?: string;
}) {
  const send = useConversation((s) => s.send);
  const router = useRouter();
  const { checkIn: storeIn, checkOut: storeOut, setDates } = useTravelDates();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  // Room catalogue (real rooms + photos) from a bookable range; and the rooms
  // priced for the guest's chosen dates.
  const [catalog, setCatalog] = useState<LiveRoom[] | null>(null);
  const [priced, setPriced] = useState<LiveRoom[] | null>(null);
  const [pricedLoading, setPricedLoading] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d = Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86_400_000);
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);
  const hasDates = nights > 0;

  // Prefill remembered dates; remember any picked here.
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

  // Room catalogue with photos — probe forward until a bookable range is found,
  // so the rooms + images always render regardless of the guest's dates.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const off of [30, 60, 90, 120]) {
        const rooms = await fetchRooms(hotelId, iso(off), iso(off + 3));
        if (cancelled) return;
        if (rooms.length) {
          setCatalog(rooms);
          return;
        }
      }
      if (!cancelled) setCatalog([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  // Live rates for the picked dates.
  useEffect(() => {
    if (!hasDates) {
      setPriced(null);
      return;
    }
    let cancelled = false;
    setPricedLoading(true);
    fetchRooms(hotelId, checkIn, checkOut).then((rooms) => {
      if (!cancelled) {
        setPriced(rooms);
        setPricedLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hotelId, checkIn, checkOut, hasDates]);

  const reserve = () => {
    if (sourceHotelId) {
      const qs = hasDates ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
      router.push(`/stay/${sourceHotelId}${qs}`);
      return;
    }
    send("", { type: "book", hotelIds: [hotelId] });
    router.push("/");
  };

  // Priced rooms (images + live rates) when the dates are bookable; otherwise the
  // catalogue (images, no price) so rooms + photos always show.
  const showPriced = hasDates && priced != null && priced.length > 0;
  const rooms = showPriced ? priced! : catalog ?? [];
  const noAvail = hasDates && priced != null && priced.length === 0;
  const loading = catalog === null || (hasDates && pricedLoading && priced === null);

  const field =
    "rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

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

      {noAvail && (
        <p className="flex items-center gap-2 rounded-xl border border-black/[0.07] bg-[#fafafa] px-4 py-3 text-sm text-[#717171]">
          <AlertCircle className="size-4 shrink-0 text-primary" />
          No live availability for these exact dates — try nearby dates. Room types are shown below.
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-[7.5rem] animate-pulse rounded-2xl bg-black/[0.04]" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <p className="rounded-2xl border border-black/[0.07] bg-white p-6 text-sm text-[#717171]">
          Room details are confirmed at booking — ask the advisor and I&apos;ll pull them up.
        </p>
      ) : (
        rooms.map((room) => (
          <div
            key={room.name}
            className="flex flex-col gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(16,24,40,0.25)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 gap-4">
              {room.image ? (
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                  <ImageWithFallback src={room.image} seed={room.name} alt={room.name} fill sizes="96px" className="object-cover" />
                </div>
              ) : (
                <div className="grid size-24 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-[#999]">
                  <BedDouble className="size-7" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-display text-lg font-medium text-[#1a1a1a]">{room.name}</h4>
                {room.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-[#717171]">{room.description}</p>
                )}
                {room.bedType && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#717171]">
                    <BedDouble className="size-3.5 text-[#999]" /> {room.bedType}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end">
              <div className="text-right">
                {showPriced && room.nightly ? (
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
                    <p className="text-xs text-[#9a9a9a]">Advisor rate + perks</p>
                  </>
                )}
              </div>
              <Button size="sm" onClick={reserve}>
                <Check className="size-4" /> Reserve
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
