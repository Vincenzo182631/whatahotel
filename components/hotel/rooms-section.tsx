"use client";

import { useRouter } from "next/navigation";
import { BedDouble, Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelBundle } from "@/hooks/use-hotels";
import { useConversation } from "@/store/conversation-store";
import { formatCurrency } from "@/lib/utils";

export function RoomsSection({ hotelId }: { hotelId: string }) {
  const { data, isLoading, isError } = useHotelBundle(hotelId);
  const send = useConversation((s) => s.send);
  const router = useRouter();

  const reserve = () => {
    send("", { type: "book", hotelIds: [hotelId] });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl glass p-6 text-sm text-foreground/60">
        <Loader2 className="size-4 animate-spin text-primary" /> Checking live
        availability…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-2xl glass p-6 text-sm text-foreground/60">
        I couldn't load rooms just now — ask the advisor and I'll pull them up.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.quote && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <span className="text-foreground/75">
            Advisor rate saves you{" "}
            <span className="font-semibold text-primary">
              {formatCurrency(data.quote.advisorSaving)}
            </span>{" "}
            vs. public rate over {data.quote.nights} nights
          </span>
          <span className="text-foreground/50">
            incl. {data.perks.length} exclusive perks
          </span>
        </div>
      )}

      {data.rooms.map((room) => (
        <div
          key={room.id}
          className="flex flex-col gap-4 rounded-2xl glass p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h4 className="font-display text-lg font-medium">{room.name}</h4>
            <p className="mt-0.5 text-sm text-foreground/60">{room.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/55">
              <span className="inline-flex items-center gap-1">
                <BedDouble className="size-3.5 text-primary/70" /> {room.bedType}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5 text-primary/70" /> Sleeps{" "}
                {room.maxOccupancy}
              </span>
              {room.view && <span>{room.view} view</span>}
              <span
                className={
                  room.refundable ? "text-primary/80" : "text-foreground/40"
                }
              >
                {room.refundable ? "Free cancellation" : "Non-refundable"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end">
            <div className="text-right">
              <p className="font-display text-xl text-gradient-gold">
                {formatCurrency(room.pricePerNight)}
              </p>
              <p className="text-xs text-foreground/50">per night</p>
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
