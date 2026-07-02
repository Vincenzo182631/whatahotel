"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, ArrowUpRight, MapPin, CalendarDays, Loader2 } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import type { LiveHotel } from "@/lib/services/live-rates";
import { cn, formatCurrency } from "@/lib/utils";

type Mode = "city" | "name";

export function LiveSearch() {
  const [mode, setMode] = useState<Mode>("city");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [hotels, setHotels] = useState<LiveHotel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);

  const canSearch =
    mode === "city" ? Boolean(city.trim() && nights > 0) : Boolean(name.trim());

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setHotels(null);
    const url =
      mode === "city"
        ? `/api/live-search?city=${encodeURIComponent(city.trim())}&checkIn=${checkIn}&checkOut=${checkOut}`
        : `/api/live-search?q=${encodeURIComponent(name.trim())}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setHotels(data.hotels ?? []);
      setSearched(mode === "city" ? city.trim() : name.trim());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-xl border border-[#DDDDDD] bg-white px-3.5 py-2.5 text-sm text-[#222] outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Find any hotel</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-[#717171]">
        <Sparkles className="size-4 text-[#FF385C]" strokeWidth={2} />
        Search every WhataHotel property worldwide — live rates and advisor perks, straight from the source.
      </p>

      {/* Search form */}
      <form onSubmit={run} className="mt-6 rounded-2xl border border-[#EBEBEB] bg-white p-4 sm:p-5">
        <div className="mb-4 inline-flex rounded-full bg-[#f7f7f7] p-1 text-sm font-semibold">
          {(["city", "name"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors",
                mode === m ? "bg-white text-[#FF385C] shadow-sm" : "text-[#717171]",
              )}
            >
              {m === "city" ? "By city" : "By hotel name"}
            </button>
          ))}
        </div>

        {mode === "city" ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-[#717171]">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Miami, Scottsdale, Rome…" className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#717171]">Check-in</span>
              <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#717171]">Check-out</span>
              <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} className={input} />
            </label>
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#717171]">Hotel name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Four Seasons, Aman, Troon North…" className={input} />
          </label>
        )}

        <button
          type="submit"
          disabled={!canSearch || loading}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Search
        </button>
        {mode === "city" && checkIn && checkOut && nights <= 0 && (
          <p className="mt-2 text-sm text-[#E61E4D]">Check-out must be after check-in.</p>
        )}
      </form>

      {/* Results */}
      {error && <p className="mt-6 text-sm text-[#E61E4D]">{error}</p>}

      {hotels && !loading && (
        <div className="mt-8">
          <p className="mb-4 text-sm text-[#717171]">
            {hotels.length
              ? `${hotels.length} ${hotels.length === 1 ? "result" : "results"} for "${searched}"${mode === "city" && nights ? ` · ${nights} night${nights > 1 ? "s" : ""}` : ""}`
              : `No hotels found for "${searched}". Try a different spelling or a nearby city.`}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((h) => (
              <a
                key={h.sourceHotelId}
                href={h.bookingUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white transition-shadow hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.18)]"
              >
                <div className="relative aspect-[4/3] bg-[#eee]">
                  <ImageWithFallback src={h.image} seed={h.sourceHotelId} alt={h.name} fill sizes="360px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <p className="font-semibold leading-tight text-[#222]">{h.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-[#717171]">
                    <MapPin className="size-3.5" /> {[h.city, h.country].filter(Boolean).join(", ")}
                  </p>
                  {h.nightly ? (
                    <p className="mt-1.5 text-sm text-[#222]">
                      <span className="font-semibold">{formatCurrency(h.nightly, h.currency)}</span> / night
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#717171]">
                      <CalendarDays className="size-3.5" /> Add dates for live rates
                    </p>
                  )}
                  {h.perks.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {h.perks.slice(0, 2).map((p) => (
                        <li key={p} className="flex gap-1.5 text-xs leading-snug text-[#555]">
                          <Sparkles className="mt-0.5 size-3 shrink-0 text-[#FF385C]" strokeWidth={1.5} />
                          {p.replace(/\*+$/g, "")}
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#FF385C]">
                    View rates & book <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
