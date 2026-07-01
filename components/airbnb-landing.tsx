"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Heart,
  Menu,
  Scale,
  Award,
  Trophy,
  Gift,
  Palmtree,
  Building2,
  Users,
  Flower2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useConversation } from "@/store/conversation-store";
import { usePreferences } from "@/store/preferences-store";
import { useFeaturedHotels } from "@/hooks/use-hotels";
import { cn, formatCurrency } from "@/lib/utils";

const CORAL = "#FF385C";

const CATS: { icon: LucideIcon; label: string; prompt: string }[] = [
  { icon: Scale, label: "Compare", prompt: "I'd like to compare the best luxury hotels side by side. Which city?" },
  { icon: Award, label: "Best in city", prompt: "Show me the best luxury hotels in a city — I'll tell you which." },
  { icon: Trophy, label: "Top 10", prompt: "Give me a ranked top 10 of the best hotels in a city." },
  { icon: Gift, label: "Best perks", prompt: "Find me hotels with the best advisor perks and inclusions." },
  { icon: Palmtree, label: "Beachfront", prompt: "Find me a beachfront luxury resort." },
  { icon: Building2, label: "City stays", prompt: "Find me a luxury city hotel with great dining." },
  { icon: Users, label: "Family", prompt: "A family-friendly luxury hotel that's still refined." },
  { icon: Flower2, label: "Spa", prompt: "A luxury hotel with an exceptional spa." },
];

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
  const send = useConversation((s) => s.send);
  const savedCount = usePreferences((s) => s.saved.length);
  const isSaved = usePreferences((s) => s.isSaved);
  const toggleSave = usePreferences((s) => s.toggleSave);
  const { data, isLoading } = useFeaturedHotels();
  const hotels = data?.hotels ?? [];

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

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/journal"
              className="hidden rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] lg:block"
            >
              Journal
            </Link>
            <Link
              href="/saved"
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
          <div className="no-scrollbar flex gap-8 overflow-x-auto py-3">
            {CATS.map((c, i) => (
              <button
                key={c.label}
                onClick={() => send(c.prompt)}
                className={cn(
                  "group flex shrink-0 flex-col items-center gap-2 border-b-2 pb-2 text-xs font-semibold transition-colors",
                  i === 0
                    ? "border-[#222] text-[#222]"
                    : "border-transparent text-[#717171] hover:border-[#DDDDDD] hover:text-[#222]",
                )}
              >
                <c.icon className="size-6" strokeWidth={1.5} />
                {c.label}
              </button>
            ))}
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
      </div>

      {/* GRID */}
      <main className="mx-auto max-w-[1360px] px-6 pb-16 pt-6">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-xl bg-[#eee]" />
                <div className="mt-3 h-4 w-2/3 rounded bg-[#eee]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[#f2f2f2]" />
              </div>
            ))}
          {hotels.map((hotel) => {
            const saved = isSaved(hotel.id);
            return (
              <div key={hotel.id} className="group">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#eee]">
                  <Link href={`/hotel/${hotel.id}`} className="absolute inset-0 z-0 block">
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
                <Link href={`/hotel/${hotel.id}`} className="mt-3 block">
                  <p className="font-semibold leading-tight text-[#222]">{hotel.name}</p>
                  <p className="mt-0.5 text-sm text-[#717171]">
                    {hotel.city}, {hotel.country}
                  </p>
                  <p className="mt-1.5 text-sm text-[#222]">
                    <span className="font-semibold">{formatCurrency(hotel.startingRate)}</span> night
                    <span className="text-[#717171]"> · perks included</span>
                  </p>
                </Link>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
