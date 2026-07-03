"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Heart,
  Menu,
  Scale,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useConversation } from "@/store/conversation-store";
import { usePreferences } from "@/store/preferences-store";
import { useHotelsByCity, type FeaturedHotel } from "@/hooks/use-hotels";
import { useAuth } from "@/hooks/use-auth";
import { CompareWizard } from "@/components/compare/compare-wizard";
import { cn } from "@/lib/utils";

const CORAL = "#FF385C";
// How many hotels to show per city (single row) before "See all" links out.
const PER_CITY = 7;

export function HotelGridCard({ hotel }: { hotel: FeaturedHotel }) {
  const isSaved = usePreferences((s) => s.isSaved);
  const toggleSave = usePreferences((s) => s.toggleSave);
  const saved = isSaved(hotel.id);
  // Clicking a hotel goes to the live search, pre-filled with this hotel's name,
  // so the guest lands on live rates for their dates (not a stored-price page).
  // The id guarantees the exact hotel resolves even if its name isn't indexed.
  const findHref = hotel.sourceHotelId
    ? `/find?q=${encodeURIComponent(hotel.name)}&id=${encodeURIComponent(hotel.sourceHotelId)}`
    : `/find?q=${encodeURIComponent(hotel.name)}`;
  return (
    <div className="group">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#eee]">
        <Link href={findHref} className="absolute inset-0 z-0 block">
          <ImageWithFallback
            src={hotel.image}
            seed={hotel.id}
            alt={hotel.name}
            fill
            sizes="(max-width:768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        {hotel.brand && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#222] shadow-sm">
            {hotel.brand}
          </span>
        )}
        <button
          onClick={() => toggleSave(hotel)}
          aria-label={saved ? "Remove from saved" : "Save"}
          className="absolute right-3 top-3 z-10 transition-transform hover:scale-110"
        >
          <Heart
            className="size-6"
            style={saved ? { fill: CORAL, color: CORAL } : { fill: "rgba(0,0,0,0.5)", color: "#fff" }}
            strokeWidth={2}
          />
        </button>
      </div>
      <Link href={findHref} className="mt-3 block">
        <p className="font-semibold leading-tight text-[#222]">{hotel.name}</p>
        <p className="mt-0.5 text-sm text-[#717171]">
          {hotel.city}, {hotel.country}
        </p>
        <p className="mt-1.5 text-sm text-[#222]">
          <span className="font-semibold">Live rates for your dates</span>
          <span className="text-[#717171]"> · perks included</span>
        </p>
      </Link>
    </div>
  );
}

function CitySection({ city }: { city: { key: string; label: string; country: string; count: number; hotels: FeaturedHotel[] } }) {
  const hasMore = city.count > PER_CITY;
  const shown = city.hotels.slice(0, PER_CITY);
  return (
    <section className="scroll-mt-24" id={`city-${city.key}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {city.label}
          <span className="ml-2 text-sm font-normal text-[#717171]">
            {city.count} hotel{city.count > 1 ? "s" : ""}
          </span>
        </h2>
        {hasMore && (
          <Link
            href={`/city/${city.key}`}
            className="group inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 text-sm font-semibold text-[#222] underline-offset-4 hover:underline"
          >
            See all {city.count}
            <ChevronRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </Link>
        )}
      </div>
      {/* Single horizontal line of 7 per city (scrolls on smaller screens) */}
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
        {shown.map((hotel) => (
          <div
            key={hotel.id}
            className="w-40 shrink-0 sm:w-48 lg:w-[calc((100%-6rem)/7)]"
          >
            <HotelGridCard hotel={hotel} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PillSearch() {
  const send = useConversation((s) => s.send);
  const isStreaming = useConversation((s) => s.isStreaming);
  const [v, setV] = useState("");
  const submit = () => {
    if (!v.trim() || isStreaming) return;
    send(v.trim());
    setV("");
  };
  return (
    <div className="flex w-full max-w-xl items-center rounded-full border border-[#EBEBEB] bg-white pl-5 pr-1.5 shadow-[0_3px_12px_rgba(0,0,0,0.1)] transition-shadow focus-within:shadow-[0_6px_20px_rgba(0,0,0,0.14)]">
      <Search className="size-4 shrink-0 text-[#222]" strokeWidth={2.5} />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Search a city — or describe your ideal stay"
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#222] placeholder:text-[#717171] focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={isStreaming || !v.trim()}
        aria-label="Search"
        className="grid size-9 shrink-0 place-items-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-50"
        style={{ background: CORAL }}
      >
        <Search className="size-4" strokeWidth={3} />
      </button>
    </div>
  );
}

export function AirbnbLanding() {
  const savedCount = usePreferences((s) => s.saved.length);
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading } = useHotelsByCity();
  const cities = data?.cities ?? [];
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto max-w-none" />
          </Link>

          <div className="hidden flex-1 justify-center md:flex">
            <PillSearch />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/find"
              className="hidden rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] md:block"
            >
              Find a hotel
            </Link>
            <Link
              href="/journal"
              className="hidden rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] lg:block"
            >
              Journal
            </Link>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border border-[#EBEBEB] py-1 pl-1 pr-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              >
                <span
                  className="grid size-7 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: CORAL }}
                >
                  {(user?.name?.[0] ?? "U").toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-[#222]">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] sm:block"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: CORAL }}
                >
                  Sign up
                </Link>
              </>
            )}

            <Link
              href="/saved"
              aria-label="Saved hotels"
              className="flex items-center gap-2 rounded-full border border-[#EBEBEB] py-1.5 pl-3.5 pr-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
            >
              <Menu className="size-4 text-[#222]" />
              <span className="relative grid size-7 place-items-center rounded-full bg-[#717171] text-white">
                <Heart className="size-3.5 fill-white" />
                {savedCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: CORAL }}
                  >
                    {savedCount}
                  </span>
                )}
              </span>
            </Link>
          </div>
        </div>

        {/* mobile search */}
        <div className="px-6 pb-3 md:hidden">
          <PillSearch />
        </div>

        {/* CATEGORY BAR */}
        <div className="mx-auto max-w-[1360px] px-6">
          <div className="flex items-center gap-3 py-3">
            <button
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: CORAL }}
            >
              <Scale className="size-4" strokeWidth={2} /> Compare hotels
            </button>
            <span className="text-sm text-[#717171]">
              Pick a city and dates, then compare 2–3 hotels side by side.
            </span>
          </div>
        </div>
      </header>

      {/* HERO LINE */}
      <div className="mx-auto max-w-[1360px] px-6 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          The best hotels, ranked for you
        </h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#717171]">
          <Sparkles className="size-4" style={{ color: CORAL }} strokeWidth={2} />
          Describe a city and what matters — your AI advisor searches, scores /10, and compares.
        </p>

        {/* Quick jump to a city */}
        {cities.length > 0 && (
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {cities.map((c) => (
              <a
                key={c.key}
                href={`#city-${c.key}`}
                className="shrink-0 rounded-full border border-[#EBEBEB] px-3.5 py-1.5 text-sm font-medium text-[#222] transition-colors hover:border-[#222]"
              >
                {c.label}
                <span className="ml-1.5 text-[#717171]">{c.count}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* CITY SECTIONS */}
      <main className="mx-auto max-w-[1360px] space-y-12 px-6 pb-16 pt-8">
        {isLoading &&
          Array.from({ length: 2 }).map((_, s) => (
            <div key={s}>
              <div className="mb-4 h-6 w-40 animate-pulse rounded bg-[#eee]" />
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square rounded-xl bg-[#eee]" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-[#eee]" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-[#f2f2f2]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        {cities.map((city) => (
          <CitySection key={city.key} city={city} />
        ))}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#EBEBEB] bg-[#F7F7F7]">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-2 px-6 py-6 text-sm text-[#717171] sm:flex-row sm:items-center">
          <span>© 2026 WhataHotel · Lorraine Travel</span>
          <span className="flex gap-5">
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/journal" className="hover:underline">Journal</Link>
            <Link href="/saved" className="hover:underline">Saved</Link>
          </span>
        </div>
      </footer>

      <CompareWizard open={compareOpen} onClose={() => setCompareOpen(false)} cities={cities} />
    </div>
  );
}
