"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BedDouble, CalendarDays, Check, Loader2 } from "lucide-react";
import { RoomGallery } from "@/components/ui/room-gallery";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatCurrency } from "@/lib/utils";

interface Room {
  name: string;
  nightly: number;
  currency: string;
  image?: string;
  images?: string[];
  bookingURL?: string;
}

export function StayBooking({
  sourceHotelId,
  name,
  city,
  country,
  image,
  checkIn,
  checkOut,
  rooms,
  nights,
}: {
  sourceHotelId: string;
  name: string;
  city: string;
  country: string;
  image: string;
  checkIn: string;
  checkOut: string;
  rooms: Room[];
  nights: number;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  // Nothing is pre-selected — the guest must choose a room first.
  const [roomName, setRoomName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ confirmation: string; saved: boolean } | null>(null);

  useEffect(() => {
    if (user) {
      setGuestName((g) => g || user.name);
      setEmail((e) => e || user.email);
      setPhone((p) => p || user.profile.phone || "");
    }
  }, [user]);

  const hasDates = Boolean(checkIn && checkOut);
  const room = rooms.find((r) => r.name === roomName); // undefined until chosen

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceHotelId,
          hotelName: name,
          city,
          country,
          image,
          checkIn,
          checkOut,
          roomName: room.name,
          nightly: room.nightly,
          currency: room.currency,
          guestName,
          email,
          phone,
          specialRequests: requests,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't complete the reservation.");
        return;
      }
      setResult({ confirmation: data.confirmation, saved: data.saved });
    } catch {
      setError("Couldn't reach the booking desk. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const field =
    "w-full rounded-xl border border-[#DDDDDD] bg-white px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

  if (result) {
    return (
      <div className="mt-5 rounded-xl border border-[#FF385C]/30 bg-[#FF385C]/[0.05] p-4 text-center">
        <span className="mx-auto grid size-9 place-items-center rounded-full bg-[#FF385C] text-white">
          <Check className="size-5" strokeWidth={3} />
        </span>
        <p className="mt-2 font-semibold">Reservation requested</p>
        <p className="mt-1 text-sm text-[#717171]">
          Confirmation <span className="font-semibold text-[#222]">{result.confirmation}</span> — your
          advisor will finalise {name} with the advisor rate and perks.
        </p>
        {result.saved ? (
          <Link href="/dashboard/trips" className="mt-3 inline-block text-sm font-semibold text-[#FF385C] hover:underline">
            View in My Trips →
          </Link>
        ) : (
          <p className="mt-2 text-xs text-[#9a9a9a]">
            <Link href="/signup" className="font-semibold text-[#FF385C] hover:underline">Create an account</Link> to track your trips.
          </p>
        )}
      </div>
    );
  }

  if (!hasDates) {
    return (
      <p className="mt-5 flex items-center gap-1.5 text-sm text-[#717171]">
        <CalendarDays className="size-4 text-[#FF385C]" /> Pick dates to see live room rates.
      </p>
    );
  }

  if (rooms.length === 0) {
    return (
      <p className="mt-5 text-sm text-[#717171]">
        No availability for those dates — try different dates.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#717171]">
        Choose a room — {nights} night{nights > 1 ? "s" : ""} · {rooms.length} categor{rooms.length === 1 ? "y" : "ies"}
      </p>
      <ul className="no-scrollbar max-h-[440px] space-y-2 overflow-y-auto pr-1">
        {rooms.map((r) => {
          const sel = r.name === roomName;
          const photos = r.images?.length ? r.images : r.image ? [r.image] : [];
          return (
            <li key={r.name}>
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-2 text-sm transition-colors",
                  sel
                    ? "border-[#FF385C] bg-[#FF385C]/[0.05]"
                    : "border-transparent bg-[#f7f7f7] hover:border-[#DDDDDD]",
                )}
              >
                {/* Thumbnail — tap to zoom / browse the room's photos. */}
                {photos.length > 0 ? (
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#eee]">
                    <RoomGallery images={photos} fallbackSrc={image} seed={r.name} alt={r.name} />
                  </div>
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#eee] text-[#FF385C]/70">
                    <BedDouble className="size-5" strokeWidth={1.5} />
                  </span>
                )}
                {/* Text + price — tap to select this room. */}
                <button
                  type="button"
                  onClick={() => setRoomName(r.name)}
                  aria-pressed={sel}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 font-semibold">{formatCurrency(r.nightly, r.currency)}</span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      sel ? "border-[#FF385C] bg-[#FF385C] text-white" : "border-[#DDDDDD]",
                    )}
                  >
                    {sel && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {room?.bookingURL ? (
        // Straight to the WhataHotel booking form, prefilled with this room, the
        // live rate, the chosen dates and guests.
        <a
          href={room.bookingURL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-xl bg-[#FF385C] px-4 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          Reserve — {formatCurrency(room.nightly, room.currency)}/night
        </a>
      ) : !open ? (
        <button
          onClick={() => room && setOpen(true)}
          disabled={!room}
          className="mt-4 block w-full rounded-xl bg-[#FF385C] px-4 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {room ? `Reserve — ${formatCurrency(room.nightly, room.currency)}/night` : "Select a room to reserve"}
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {room && (
            <div className="flex items-center justify-between rounded-xl bg-[#f7f7f7] px-3 py-2 text-sm">
              <span className="truncate font-semibold">{room.name}</span>
              <span className="shrink-0 text-[#717171]">{formatCurrency(room.nightly, room.currency)}/night</span>
            </div>
          )}
          <input className={field} placeholder="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
          <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={field} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={field} placeholder="Special requests (optional)" value={requests} onChange={(e) => setRequests(e.target.value)} />

          {room && nights > 0 && (
            <p className="text-xs text-[#717171]">
              Estimated total{" "}
              <span className="font-semibold text-[#222]">{formatCurrency(room.nightly * nights, room.currency)}</span>{" "}
              for {nights} night{nights > 1 ? "s" : ""} · advisor perks included.
            </p>
          )}
          {error && <p className="text-sm text-[#E61E4D]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />} Confirm reservation
          </button>
        </form>
      )}
    </div>
  );
}
