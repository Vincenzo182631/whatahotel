"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CalendarDays, Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useHotelBundle } from "@/hooks/use-hotels";
import { useConversation } from "@/store/conversation-store";
import { useTravelDates } from "@/store/travel-dates-store";
import { formatCurrency } from "@/lib/utils";
import type { LiveRoom } from "@/lib/services/live-rates";

interface RoomView {
  key: string;
  name: string;
  description?: string;
  bedType?: string;
  image?: string;
  sleeps?: number;
  view?: string;
  refundable?: boolean;
  nightly?: number;
  total?: number;
  currency?: string;
}

export function RoomsSection({
  hotelId,
  sourceHotelId,
}: {
  hotelId: string;
  sourceHotelId?: string;
}) {
  const { data, isLoading, isError } = useHotelBundle(hotelId);
  const send = useConversation((s) => s.send);
  const router = useRouter();
  const { checkIn: storeIn, checkOut: storeOut, setDates } = useTravelDates();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [liveRooms, setLiveRooms] = useState<LiveRoom[] | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);
  const hasDates = nights > 0;

  // Prefill from the remembered dates.
  useEffect(() => {
    if (storeIn && storeOut && !checkIn && !checkOut) {
      setCheckIn(storeIn);
      setCheckOut(storeOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIn, storeOut]);

  // Remember any valid dates the guest picks here.
  useEffect(() => {
    if (hasDates) setDates(checkIn, checkOut);
  }, [checkIn, checkOut, hasDates, setDates]);

  // A near-future range used only to fetch the room catalogue + photos before
  // the guest picks dates. Once they pick dates we re-fetch and show real rates.
  const fallback = useMemo(() => {
    const ci = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const co = new Date(Date.now() + 33 * 86_400_000).toISOString().slice(0, 10);
    return { ci, co };
  }, []);

  useEffect(() => {
    const ci = hasDates ? checkIn : fallback.ci;
    const co = hasDates ? checkOut : fallback.co;
    let cancelled = false;
    setRoomsLoading(true);
    fetch(`/api/rates?id=${encodeURIComponent(hotelId)}&checkIn=${ci}&checkOut=${co}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setLiveRooms(d?.live ? (d.rooms ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setLiveRooms([]);
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotelId, checkIn, checkOut, hasDates, fallback]);

  const reserve = (roomName?: string) => {
    if (sourceHotelId) {
      const qs = hasDates ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
      router.push(`/stay/${sourceHotelId}${qs}`);
      return;
    }
    send("", { type: "book", hotelIds: [hotelId] });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl glass p-6 text-sm text-foreground/72">
        <Loader2 className="size-4 animate-spin text-primary" /> Checking live
        availability…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-2xl glass p-6 text-sm text-foreground/72">
        I couldn't load rooms just now — ask the advisor and I'll pull them up.
      </div>
    );
  }

  // Prefer the live rooms (with photos + real rates); fall back to the list.
  const rooms: RoomView[] =
    liveRooms && liveRooms.length > 0
      ? liveRooms.map((r) => ({
          key: r.name,
          name: r.name,
          description: r.description,
          bedType: r.bedType,
          image: r.image,
          nightly: r.nightly,
          total: r.total,
          currency: r.currency,
        }))
      : data.rooms.map((r) => ({
          key: r.id,
          name: r.name,
          description: r.description,
          bedType: r.bedType,
          sleeps: r.maxOccupancy,
          view: r.view,
          refundable: r.refundable,
        }));

  const field =
    "rounded-xl border border-[#DDDDDD] bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4">
      {/* Date picker — live rates appear once dates are chosen */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-1.5 text-sm text-foreground/75">
          <CalendarDays className="size-4 text-primary" />
          {hasDates ? "Live rates for your dates" : "Pick your dates for live rates"}
        </div>
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/65">Check-in</span>
            <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/65">Check-out</span>
            <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className={field} />
          </label>
          <span className="pb-2 text-xs text-foreground/65">incl. {data.perks.length} exclusive perks</span>
        </div>
      </div>

      {checkIn && checkOut && !hasDates && (
        <p className="text-sm text-destructive">Check-out must be after check-in.</p>
      )}

      {roomsLoading ? (
        <div className="flex items-center gap-2 rounded-2xl glass p-6 text-sm text-foreground/72">
          <Loader2 className="size-4 animate-spin text-primary" />
          {hasDates ? "Fetching live rates…" : "Loading rooms…"}
        </div>
      ) : (
        rooms.map((room) => (
          <div
            key={room.key}
            className="flex flex-col gap-4 rounded-2xl glass p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 gap-4">
              {room.image ? (
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                  <ImageWithFallback src={room.image} seed={room.key} alt={room.name} fill sizes="96px" className="object-cover" />
                </div>
              ) : (
                <div className="grid size-24 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-primary/70">
                  <BedDouble className="size-7" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-display text-lg font-medium">{room.name}</h4>
                {room.description && (
                  <p className="mt-0.5 text-sm text-foreground/72">{room.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
                  {room.bedType && (
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="size-3.5 text-primary/70" /> {room.bedType}
                    </span>
                  )}
                  {room.sleeps && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5 text-primary/70" /> Sleeps {room.sleeps}
                    </span>
                  )}
                  {room.view && <span>{room.view} view</span>}
                  {room.refundable !== undefined && (
                    <span className={room.refundable ? "text-primary/80" : "text-foreground/55"}>
                      {room.refundable ? "Free cancellation" : "Non-refundable"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end">
              <div className="text-right">
                {hasDates && room.nightly ? (
                  <>
                    <p className="font-display text-xl text-gradient-gold">
                      {formatCurrency(room.nightly, room.currency)}
                      <span className="text-xs font-normal text-foreground/65"> / night</span>
                    </p>
                    {room.total ? (
                      <p className="text-xs text-foreground/65">
                        {formatCurrency(room.total, room.currency)} total · {nights} night{nights > 1 ? "s" : ""}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="font-display text-base text-gradient-gold">Live rate for your dates</p>
                    <p className="text-xs text-foreground/65">Advisor rate + perks</p>
                  </>
                )}
              </div>
              <Button size="sm" onClick={() => reserve(room.name)}>
                <Check className="size-4" /> Reserve
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
