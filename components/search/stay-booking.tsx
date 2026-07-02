"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";

interface Room {
  name: string;
  nightly: number;
  currency: string;
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
}: {
  sourceHotelId: string;
  name: string;
  city: string;
  country: string;
  image: string;
  checkIn: string;
  checkOut: string;
  rooms: Room[];
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [roomName, setRoomName] = useState(rooms[0]?.name ?? "");
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
  const room = rooms.find((r) => r.name === roomName) ?? rooms[0];
  const nights =
    hasDates
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
      : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          roomName: room?.name,
          nightly: room?.nightly,
          currency: room?.currency,
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
      <p className="mt-5 text-sm text-[#717171]">Pick your dates above, then reserve.</p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 block w-full rounded-xl bg-[#FF385C] px-4 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
      >
        Reserve{room ? ` — ${formatCurrency(room.nightly, room.currency)}/night` : ""}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      {rooms.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#717171]">Room</span>
          <select value={roomName} onChange={(e) => setRoomName(e.target.value)} className={field}>
            {rooms.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} — {formatCurrency(r.nightly, r.currency)}/night
              </option>
            ))}
          </select>
        </label>
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
  );
}
