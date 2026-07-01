"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Crown, Clock, MapPin, Utensils, Coffee, Moon, Compass } from "lucide-react";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { useAuth } from "@/hooks/use-auth";
import type { Itinerary, ScheduleItem } from "@/lib/ai/itinerary";
import type { Trip } from "@/lib/data/types";

const CITIES = [
  { key: "paris", label: "Paris" },
  { key: "london", label: "London" },
  { key: "newyork", label: "New York" },
  { key: "tokyo", label: "Tokyo" },
  { key: "dubai", label: "Dubai" },
  { key: "bali", label: "Bali" },
  { key: "maldives", label: "Maldives" },
  { key: "maui", label: "Maui" },
];

const CITY_KEYS: Record<string, string> = {
  Paris: "paris", London: "london", "New York": "newyork", Tokyo: "tokyo",
  Dubai: "dubai", Bali: "bali", Maldives: "maldives", Maui: "maui",
};

const ITEM_ICON: Record<ScheduleItem["type"], typeof Clock> = {
  start: MapPin, attraction: Compass, meal: Utensils, cafe: Coffee, activity: Compass, evening: Moon,
};

function DayCard({ day }: { day: Itinerary["schedule"][number] }) {
  return (
    <Card>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#FF385C] text-xs font-bold text-white">
          {day.day}
        </span>
        <h3 className="font-semibold">Day {day.day}</h3>
        <span className="text-sm text-[#717171]">· {day.theme}</span>
      </div>
      <ol className="space-y-3">
        {day.items.map((it, i) => {
          const Icon = ITEM_ICON[it.type];
          return (
            <li key={i} className="flex gap-3">
              <span className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-[#717171]">{it.time}</span>
              <Icon className="mt-0.5 size-4 shrink-0 text-[#FF385C]" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#222]">{it.title}</p>
                {it.note && <p className="text-xs text-[#717171]">{it.note}</p>}
                {it.travelMins != null && (
                  <p className="text-xs text-[#9a9a9a]">~{it.travelMins} min away</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export default function AssistantPage() {
  const { user } = useAuth();
  const { data: tripData } = useQuery({
    queryKey: ["trips"],
    queryFn: async (): Promise<{ upcoming: Trip[]; past: Trip[] }> => {
      const res = await fetch("/api/trips");
      return res.ok ? res.json() : { upcoming: [], past: [] };
    },
  });

  const [destinationKey, setDestinationKey] = useState("paris");
  const [hotelName, setHotelName] = useState("");
  const [days, setDays] = useState(3);
  const [travelerType, setTravelerType] = useState("couple");
  const [cuisine, setCuisine] = useState("");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the user's upcoming trip so recommendations start at their hotel.
  useEffect(() => {
    const trip = tripData?.upcoming?.[0];
    if (trip) {
      setDestinationKey(CITY_KEYS[trip.city] ?? "paris");
      setHotelName(trip.hotelName);
    }
    if (user?.profile.travelerType) setTravelerType(user.profile.travelerType);
  }, [tripData, user]);

  const isPremium = user?.membership === "premium";

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/assistant/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationKey, hotelName, days, travelerType, cuisine }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.message || data.error || "Something went wrong.");
      return;
    }
    setItinerary(data.itinerary);
  };

  if (!user) return null;

  if (!isPremium) {
    return (
      <>
        <PageHeader title="AI Travel Assistant" subtitle="Your personal trip planner." />
        <Card className="border-[#FF385C]/30 bg-[#FF385C]/[0.04] text-center">
          <Crown className="mx-auto size-8 text-[#FF385C]" />
          <p className="mt-3 text-lg font-semibold">A Premium benefit</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#717171]">
            The AI Travel Advisor builds complete day-by-day itineraries from your hotel — attractions,
            dining, cafés, activities and optimised travel times. Upgrade to unlock it.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-5 inline-block rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Upgrade to Premium
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="AI Travel Assistant"
        subtitle="Tell me about your trip and I'll build a full itinerary from your hotel."
      />

      <Card className="mb-6">
        <form onSubmit={generate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Destination</span>
            <select value={destinationKey} onChange={(e) => setDestinationKey(e.target.value)} className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20">
              {CITIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Your hotel (start point)</span>
            <input value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="e.g. Le Meurice" className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Trip length</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Traveling as</span>
            <select value={travelerType} onChange={(e) => setTravelerType(e.target.value)} className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20">
              <option value="solo">Solo</option>
              <option value="couple">Couple</option>
              <option value="family">Family</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Cuisine preference (optional)</span>
            <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="e.g. Italian, sushi" className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              <Sparkles className="size-4" /> {loading ? "Planning…" : "Generate itinerary"}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-[#E61E4D]">{error}</p>}
      </Card>

      {itinerary && (
        <div className="space-y-5">
          <Card className="bg-[#FF385C]/[0.04]">
            <p className="text-sm text-[#222]">{itinerary.overview}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#717171]">
              <MapPin className="size-4 text-[#FF385C]" /> {itinerary.transport}
            </p>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {itinerary.schedule.map((d) => <DayCard key={d.day} day={d} />)}
          </div>
          <Card>
            <h3 className="mb-2 font-semibold">Advisor tips</h3>
            <ul className="space-y-1.5">
              {itinerary.tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#222]">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#FF385C]" /> {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
