"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useHotelBundle } from "@/hooks/use-hotels";
import { useConversation } from "@/store/conversation-store";
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
}

export function RoomsSection({ hotelId }: { hotelId: string }) {
  const { data, isLoading, isError } = useHotelBundle(hotelId);
  const send = useConversation((s) => s.send);
  const router = useRouter();
  const [liveRooms, setLiveRooms] = useState<LiveRoom[] | null>(null);

  // Pull the live room catalogue, which carries real per-room photos. A
  // near-future date range is used only to retrieve rooms + images; prices are
  // never shown here (only "live rate for your dates").
  useEffect(() => {
    const ci = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const co = new Date(Date.now() + 33 * 86_400_000).toISOString().slice(0, 10);
    let cancelled = false;
    fetch(`/api/rates?id=${encodeURIComponent(hotelId)}&checkIn=${ci}&checkOut=${co}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setLiveRooms(d?.live ? (d.rooms ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setLiveRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  const reserve = () => {
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

  // Prefer the live rooms (with photos); fall back to the descriptive list.
  const rooms: RoomView[] =
    liveRooms && liveRooms.length > 0
      ? liveRooms.map((r) => ({
          key: r.name,
          name: r.name,
          description: r.description,
          bedType: r.bedType,
          image: r.image,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <span className="text-foreground/75">
          Rates are confirmed live for your dates — pick your dates to see the
          exact advisor rate.
        </span>
        <span className="text-foreground/65">
          incl. {data.perks.length} exclusive perks
        </span>
      </div>

      {rooms.map((room) => (
        <div
          key={room.key}
          className="flex flex-col gap-4 rounded-2xl glass p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 gap-4">
            {room.image ? (
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                <ImageWithFallback
                  src={room.image}
                  seed={room.key}
                  alt={room.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
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
              <p className="font-display text-base text-gradient-gold">
                Live rate for your dates
              </p>
              <p className="text-xs text-foreground/65">Advisor rate + perks</p>
            </div>
            <Button size="sm" onClick={reserve}>
              <Check className="size-4" /> Reserve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
