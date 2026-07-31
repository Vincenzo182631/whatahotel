"use client";

import { useState } from "react";
import {
  MapPin,
  Plus,
  X,
  Search,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveHotelCards } from "@/components/chat/live-hotel-cards";
import type { LiveHotel } from "@/lib/services/live-rates";

const BRANDS = [
  "Four Seasons", "Ritz-Carlton", "St. Regis", "JW Marriott", "Marriott",
  "W Hotels", "Waldorf Astoria", "Conrad", "Hilton", "Park Hyatt", "Grand Hyatt",
  "Hyatt", "Mandarin Oriental", "Rosewood", "Aman", "Six Senses", "Fairmont",
  "Sofitel", "InterContinental", "Kimpton", "Peninsula", "Shangri-La",
];
const HOTEL_TYPES = [
  ["luxury", "Luxury"], ["resort", "Resort"], ["boutique", "Boutique"],
  ["family-friendly", "Family-friendly"], ["business", "Business"],
  ["adults-only", "Adults-only"], ["beach resort", "Beach resort"],
] as const;
const AMENITIES = [
  "spa", "pool", "gym", "restaurant", "bar", "golf", "casino",
  "beach access", "parking", "pet-friendly", "kids' facilities",
];
const LOCATIONS = [
  "beach", "waterfront", "downtown", "airport", "theme park",
  "major attractions", "nightlife", "restaurants", "shopping", "mountain", "ski resort",
];
const TRAVELERS = [
  ["couple", "Couple"], ["family", "Family"], ["honeymoon", "Romantic / Honeymoon"],
  ["solo", "Solo"], ["business", "Business"], ["group", "Group"], ["friends", "Friends"],
] as const;

interface Group {
  city: string;
  brand?: string;
  hotels: LiveHotel[];
  empty?: boolean;
  brandMissing?: boolean;
  note?: string;
}
interface Summary {
  cities: { name: string; brand?: string }[];
  checkIn: string;
  checkOut: string;
  brand?: string;
  adults: number;
  children: number;
  budgetMin?: number;
  budgetMax?: number;
  hotelType?: string;
  amenities: string[];
  locationPref?: string;
  travelerType?: string;
  notes?: string;
}

const field =
  "w-full rounded-xl border border-[#DDDDDD] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";
const label = "text-xs font-semibold uppercase tracking-wide text-[#717171]";
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

export function AdvancedSearchForm() {
  const [cities, setCities] = useState<{ name: string; brand: string }[]>([{ name: "", brand: "" }]);
  const [perCityBrand, setPerCityBrand] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [brand, setBrand] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showPrefs, setShowPrefs] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [hotelType, setHotelType] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [locationPref, setLocationPref] = useState("");
  const [travelerType, setTravelerType] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const setCity = (i: number, patch: Partial<{ name: string; brand: string }>) =>
    setCities((cur) => cur.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addCity = () => setCities((c) => (c.length < 3 ? [...c, { name: "", brand: "" }] : c));
  const removeCity = (i: number) => setCities((c) => c.filter((_, j) => j !== i));
  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
      : 0;
  const canSearch = cities.some((c) => c.name.trim()) && nights > 0;

  const run = async () => {
    setError(null);
    if (!canSearch) {
      setError("Add at least one city and both dates.");
      return;
    }
    setLoading(true);
    setGroups(null);
    setSummary(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cities: cities
            .filter((c) => c.name.trim())
            .map((c) => ({ name: c.name.trim(), brand: perCityBrand ? c.brand : "" })),
          checkIn,
          checkOut,
          brand: perCityBrand ? "" : brand,
          adults,
          children,
          budgetMin: budgetMin || undefined,
          budgetMax: budgetMax || undefined,
          hotelType,
          amenities,
          locationPref,
          travelerType,
          notes,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error || "Search failed — try again.");
        return;
      }
      setGroups(d.groups);
      setSummary(d.summary);
    } catch {
      setError("Search failed — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search & compare — up to 3 cities</h1>
        <p className="mt-1 text-sm text-[#717171]">
          Structured search with the same intelligence as the advisor: brands, locations, amenities and preferences — best matches per city.
        </p>
      </div>

      {/* Cities */}
      <section className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className={label}>Destinations (1–3)</p>
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#555]">
            <input type="checkbox" checked={perCityBrand} onChange={(e) => setPerCityBrand(e.target.checked)} />
            Different brand per city
          </label>
        </div>
        <div className="space-y-2.5">
          {cities.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#FF385C]/10 text-xs font-bold text-[#FF385C]">
                {i + 1}
              </span>
              <div className="relative min-w-0 flex-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9a9a9a]" />
                <input
                  className={cn(field, "pl-9")}
                  placeholder={`City ${i + 1} — e.g. ${["Miami", "Orlando", "New York"][i] ?? "another city"}`}
                  value={c.name}
                  onChange={(e) => setCity(i, { name: e.target.value })}
                />
              </div>
              {perCityBrand && (
                <select className={cn(field, "w-auto min-w-[9rem]")} value={c.brand} onChange={(e) => setCity(i, { brand: e.target.value })}>
                  <option value="">Any brand</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              {cities.length > 1 && (
                <button onClick={() => removeCity(i)} className="grid size-9 shrink-0 place-items-center rounded-full text-[#9a9a9a] hover:bg-black/[0.04] hover:text-[#FF385C]" aria-label="Remove city">
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {cities.length < 3 && (
          <button onClick={addCity} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#DDDDDD] px-3.5 py-1.5 text-sm font-medium text-[#222] hover:bg-[#f7f7f7]">
            <Plus className="size-4" /> Add another city
          </button>
        )}
      </section>

      {/* Dates + brand + guests */}
      <section className="mt-4 grid gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Check-in</span>
          <input type="date" className={field} value={checkIn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Check-out</span>
          <input type="date" className={field} value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        {!perCityBrand && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>Brand</span>
            <select className={field} value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">Any brand</option>
              {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={label}>Adults</span>
            <input type="number" min={1} className={field} value={adults} onChange={(e) => setAdults(Math.max(1, +e.target.value))} />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={label}>Children</span>
            <input type="number" min={0} className={field} value={children} onChange={(e) => setChildren(Math.max(0, +e.target.value))} />
          </label>
        </div>
      </section>

      {/* Preferences (collapsible) */}
      <section className="mt-4 rounded-2xl border border-[#EBEBEB] bg-white p-5">
        <button onClick={() => setShowPrefs((v) => !v)} className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
            <SlidersHorizontal className="size-4 text-[#FF385C]" /> Preferences (optional)
          </span>
          <span className="text-xs text-[#717171]">{showPrefs ? "Hide" : "Show"}</span>
        </button>
        {showPrefs && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Hotel type</span>
                <select className={field} value={hotelType} onChange={(e) => setHotelType(e.target.value)}>
                  <option value="">Any</option>
                  {HOTEL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Location</span>
                <select className={field} value={locationPref} onChange={(e) => setLocationPref(e.target.value)}>
                  <option value="">Anywhere</option>
                  {LOCATIONS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Traveller</span>
                <select className={field} value={travelerType} onChange={(e) => setTravelerType(e.target.value)}>
                  <option value="">—</option>
                  {TRAVELERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className={label}>Budget min</span>
                  <input type="number" min={0} placeholder="$" className={field} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className={label}>Budget max</span>
                  <input type="number" min={0} placeholder="$" className={field} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                </label>
              </div>
            </div>
            <div>
              <p className={cn(label, "mb-2")}>Amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      amenities.includes(a) ? "border-[#FF385C] bg-[#FF385C]/[0.06] text-[#FF385C]" : "border-[#DDDDDD] text-[#555] hover:bg-[#f7f7f7]",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Anything else we should know?</span>
              <textarea
                className={cn(field, "min-h-20 resize-y")}
                placeholder="e.g. a quiet luxury hotel with an ocean view, a great spa, and restaurants nearby"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      {error && <p className="mt-4 rounded-xl bg-[#FF385C]/[0.08] px-3.5 py-2.5 text-sm text-[#c2334f]">{error}</p>}

      <button
        onClick={run}
        disabled={loading}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        {loading ? "Searching each city…" : "Search & compare"}
      </button>

      {/* Results */}
      {summary && (
        <div className="mt-10">
          {/* Search summary */}
          <div className="rounded-2xl border border-[#EBEBEB] bg-[#fafafa] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#717171]">
              <Sparkles className="size-3.5 text-[#FF385C]" /> Your search
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#333]">
              <span><b>Destinations:</b> {summary.cities.map((c) => c.name.split(",")[0] + (c.brand ? ` (${c.brand})` : "")).join(" • ")}</span>
              {summary.checkIn && summary.checkOut && <span><b>Dates:</b> {fmtDate(summary.checkIn)}–{fmtDate(summary.checkOut)}</span>}
              {summary.brand && <span><b>Brand:</b> {summary.brand}</span>}
              <span><b>Guests:</b> {summary.adults} adult{summary.adults > 1 ? "s" : ""}{summary.children ? `, ${summary.children} children` : ""}</span>
              {summary.hotelType && <span className="capitalize"><b>Style:</b> {summary.hotelType}</span>}
              {(summary.budgetMin || summary.budgetMax) && <span><b>Budget:</b> {summary.budgetMin ? `$${summary.budgetMin}` : ""}{summary.budgetMin && summary.budgetMax ? "–" : ""}{summary.budgetMax ? `$${summary.budgetMax}` : "+"}</span>}
              {summary.locationPref && <span className="capitalize"><b>Near:</b> {summary.locationPref}</span>}
              {summary.amenities.length > 0 && <span className="capitalize"><b>Amenities:</b> {summary.amenities.join(" • ")}</span>}
            </div>
            {(() => {
              const bits = [
                summary.brand,
                summary.hotelType,
                summary.locationPref ? `near the ${summary.locationPref}` : "",
                summary.travelerType,
                ...summary.amenities,
              ].filter(Boolean);
              if (!bits.length) return null;
              return (
                <p className="mt-2.5 border-t border-[#EBEBEB] pt-2.5 text-sm text-[#555]">
                  <b className="text-[#1a1a1a]">Why these hotels?</b> Ranked to best match your preferences for {bits.join(", ")}.
                </p>
              );
            })()}
          </div>

          {/* Per-city results */}
          <div className="mt-6 space-y-8">
            {groups?.map((g) => (
              <div key={g.city}>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <MapPin className="size-4 text-[#FF385C]" /> {g.city.split(",")[0]}
                  {g.brand && <span className="text-sm font-normal text-[#717171]">· {g.brand}</span>}
                </h2>
                {g.note && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#FF385C]/25 bg-[#FF385C]/[0.04] p-3 text-sm text-[#8a2540]">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#FF385C]" />
                    <span>{g.note}</span>
                  </div>
                )}
                {g.hotels.length > 0 ? (
                  <LiveHotelCards hotels={g.hotels} checkIn={summary.checkIn} checkOut={summary.checkOut} />
                ) : (
                  <div className="flex items-start gap-2 rounded-2xl border border-[#EBEBEB] bg-white p-4 text-sm text-[#717171]">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#FF385C]" />
                    <span>
                      {g.brandMissing
                        ? `No ${g.brand} property was found in ${g.city.split(",")[0]} for these dates. Try “Any brand” to see luxury alternatives here.`
                        : `No WhataHotel properties came back for ${g.city.split(",")[0]} on these dates.`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
