"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Scale, Sparkles } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { ChatComposer } from "@/components/chat/chat-composer";
import { useConversation } from "@/store/conversation-store";
import { usePreferences } from "@/store/preferences-store";
import { type FeaturedHotel } from "@/hooks/use-hotels";
import { useAuth } from "@/hooks/use-auth";
import { CompareWizard } from "@/components/compare/compare-wizard";
import { useTravelDates } from "@/store/travel-dates-store";
import { useHotelLiveRate, useInView } from "@/hooks/use-hotel-live-rate";
import { formatCurrency } from "@/lib/utils";

const CORAL = "#FF385C";

// A hotel card used by the /city pages (kept here so those pages keep working).
export function HotelGridCard({ hotel }: { hotel: FeaturedHotel }) {
  const isSaved = usePreferences((s) => s.isSaved);
  const toggleSave = usePreferences((s) => s.toggleSave);
  const saved = isSaved(hotel.id);
  const { checkIn, checkOut } = useTravelDates();
  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86_400_000))
      : 0;
  const { ref, inView } = useInView<HTMLDivElement>();
  const { data: rate } = useHotelLiveRate(hotel.id, checkIn, checkOut, inView);
  const findHref = hotel.sourceHotelId
    ? `/find?q=${encodeURIComponent(hotel.name)}&id=${encodeURIComponent(hotel.sourceHotelId)}`
    : `/find?q=${encodeURIComponent(hotel.name)}`;
  return (
    <div ref={ref} className="group">
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
        {rate && nights > 0 ? (
          <p className="mt-1.5 text-sm text-[#222]">
            <span className="font-semibold">{formatCurrency(rate.nightly, rate.currency)}</span>
            <span className="text-[#717171]">
              {" "}
              /night · {formatCurrency(rate.total, rate.currency)} for {nights} night{nights > 1 ? "s" : ""} · perks incl.
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-[#222]">
            <span className="font-semibold">Live rates for your dates</span>
            <span className="text-[#717171]"> · perks included</span>
          </p>
        )}
      </Link>
    </div>
  );
}

// Rotating example prompts — 5 batches that cycle so the homepage feels alive.
const SUGGESTION_BATCHES: string[][] = [
  [
    "Best 5-star hotels in Tokyo for a honeymoon",
    "Family-friendly beach resorts in Dubai",
    "Compare the top hotels in Bali",
    "Boutique hotels in Paris near the Louvre",
    "Overwater villas in the Maldives",
  ],
  [
    "Ski-in ski-out lodges in Aspen",
    "Rooftop-pool hotels in Bangkok",
    "Compare luxury riads in Marrakech",
    "Beachfront resorts in Phuket for a family",
    "Design hotels in Copenhagen",
  ],
  [
    "Safari lodges near the Serengeti",
    "Best-value 5-star hotels in Lisbon",
    "Compare oceanfront resorts in Maui",
    "Grand palace hotels in Rome",
    "All-inclusive resorts in Cancún",
  ],
  [
    "Honeymoon suites in Santorini",
    "Wellness & spa hotels in Bali",
    "Compare the top hotels in New York City",
    "Boutique stays on the Amalfi Coast",
    "Private-pool villas in Phuket",
  ],
  [
    "Luxury tented camps in Jaisalmer",
    "Best business hotels in Singapore",
    "Compare beach resorts in the Maldives",
    "Charming hotels in Kyoto near the temples",
    "Ocean-view suites in Cape Town",
  ],
];

export function AirbnbLanding() {
  const savedCount = usePreferences((s) => s.saved.length);
  const { user, isAuthenticated } = useAuth();
  const send = useConversation((s) => s.send);
  const isStreaming = useConversation((s) => s.isStreaming);
  const [compareOpen, setCompareOpen] = useState(false);
  const [batch, setBatch] = useState(0);

  // Cycle the example prompts through the 5 batches.
  useEffect(() => {
    const iv = setInterval(() => setBatch((b) => (b + 1) % SUGGESTION_BATCHES.length), 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#222]">
      {/* HEADER — minimal */}
      <header className="border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto max-w-none" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link href="/journal" className="hidden rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] lg:block">
              Journal
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border border-[#EBEBEB] py-1 pl-1 pr-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              >
                <span className="grid size-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: CORAL }}>
                  {(user?.name?.[0] ?? "U").toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-[#222]">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-full px-3.5 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7] sm:block">
                  Log in
                </Link>
                <Link href="/signup" className="rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: CORAL }}>
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
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: CORAL }}>
                    {savedCount}
                  </span>
                )}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO — a single large chat box, LLM-style */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF385C]/10 px-3 py-1 text-xs font-semibold text-[#FF385C]">
            <Sparkles className="size-3.5" strokeWidth={2.5} /> Your AI luxury travel advisor
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Where would you like to stay?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-[#717171]">
            Ask me to find or compare hotels anywhere in the world — I&rsquo;ll pull live rates,
            rooms, perks and honest recommendations for your dates.
          </p>

          <div className="mt-7 text-left">
            <ChatComposer
              size="hero"
              autoFocus
              onSend={(t) => send(t)}
              disabled={isStreaming}
              placeholder="e.g. Compare the best 5-star hotels in Bali for a honeymoon"
            />
          </div>

          {/* Example prompts — rotate through the batches */}
          <div className="mt-5 min-h-[3.5rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={batch}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35 }}
                className="flex flex-wrap justify-center gap-2"
              >
                {SUGGESTION_BATCHES[batch].map((s) => (
                  <button
                    key={s}
                    onClick={() => !isStreaming && send(s)}
                    disabled={isStreaming}
                    className="rounded-full border border-[#EBEBEB] bg-white px-3.5 py-1.5 text-xs text-[#555] transition-colors hover:border-[#DDDDDD] hover:text-[#222] disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Secondary: side-by-side compare wizard */}
          <button
            onClick={() => setCompareOpen(true)}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#717171] transition-colors hover:text-[#FF385C]"
          >
            <Scale className="size-4" strokeWidth={2} /> Or compare hotels side by side
          </button>
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

      <CompareWizard open={compareOpen} onClose={() => setCompareOpen(false)} cities={[]} />
    </div>
  );
}
