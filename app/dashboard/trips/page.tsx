"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { formatCurrency } from "@/lib/utils";
import type { Trip } from "@/lib/data/types";

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function TripRow({ trip }: { trip: Trip }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Link
        href={`/hotel/${trip.hotelId}`}
        className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-36"
      >
        <ImageWithFallback src={trip.image} seed={trip.hotelId} alt={trip.hotelName} fill sizes="150px" className="object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/hotel/${trip.hotelId}`} className="font-semibold hover:text-[#FF385C]">
          {trip.hotelName}
        </Link>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-[#717171]">
          <MapPin className="size-3.5" /> {trip.city}, {trip.country}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#222]">
          <CalendarDays className="size-3.5 text-[#FF385C]" />
          {fmt(trip.checkIn)} → {fmt(trip.checkOut)} · {trip.nights} nights
        </p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="font-semibold">{formatCurrency(trip.total, trip.currency)}</p>
        <p className="text-xs text-[#717171]">Conf. {trip.confirmation}</p>
      </div>
    </Card>
  );
}

export default function TripsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: async (): Promise<{ upcoming: Trip[]; past: Trip[] }> => {
      const res = await fetch("/api/trips");
      if (!res.ok) throw new Error("Failed to load trips");
      return res.json();
    },
  });

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];

  return (
    <>
      <PageHeader title="My Trips" subtitle="Your upcoming reservations and travel history." />

      {isLoading && <Card>Loading your trips…</Card>}

      {!isLoading && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#717171]">
              Upcoming reservations
            </h2>
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.map((t) => <TripRow key={t.id} trip={t} />)}
              </div>
            ) : (
              <Card className="text-sm text-[#717171]">
                No upcoming trips yet.{" "}
                <Link href="/" className="font-semibold text-[#FF385C] hover:underline">
                  Find your next stay →
                </Link>
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#717171]">
              Past trips
            </h2>
            {past.length ? (
              <div className="space-y-3">
                {past.map((t) => <TripRow key={t.id} trip={t} />)}
              </div>
            ) : (
              <Card className="text-sm text-[#717171]">No past trips on record.</Card>
            )}
          </section>
        </div>
      )}
    </>
  );
}
