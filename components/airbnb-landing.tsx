"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Scale, Sparkles, Mic } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { ChatComposer } from "@/components/chat/chat-composer";
import { RealtimeVoice } from "@/components/voice/realtime-voice";
import { VOICE_FEATURES } from "@/lib/flags";
import { useConversation } from "@/store/conversation-store";
import { usePreferences } from "@/store/preferences-store";
import { type FeaturedHotel } from "@/hooks/use-hotels";
import { useAuth } from "@/hooks/use-auth";
import { CompareWizard } from "@/components/compare/compare-wizard";
import { useTravelDates } from "@/store/travel-dates-store";
import { useHotelLiveRate, useInView } from "@/hooks/use-hotel-live-rate";
import { formatCurrency } from "@/lib/utils";

const CORAL = "#FF385C";
const BG_MOBILE = "https://assets.cdn.filesafe.space/fBHK0xDUEFQL6rOoyKnY/media/6a4f140e9c9b37b5fdaa0aa1.webp";
const BG_DESKTOP = "https://assets.cdn.filesafe.space/fBHK0xDUEFQL6rOoyKnY/media/6a4f140eeada8c1f457a48a3.webp";

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

// Rotating example prompts. Each of the 5 pill slots cycles through its OWN list
// (a column), and only one pill changes at a time — so they flip individually,
// not all together, for a livelier feel.
const PILL_COLUMNS: string[][] = [
  [
    "Best 5-star hotels in Tokyo for a honeymoon",
    "Ski-in ski-out lodges in Aspen",
    "Safari lodges near the Serengeti",
    "Honeymoon suites in Santorini",
    "Luxury tented camps in Jaisalmer",
  ],
  [
    "Family-friendly beach resorts in Dubai",
    "Rooftop-pool hotels in Bangkok",
    "Best-value 5-star hotels in Lisbon",
    "Wellness & spa hotels in Bali",
    "Best business hotels in Singapore",
  ],
  [
    "Compare the top hotels in Bali",
    "Compare luxury riads in Marrakech",
    "Compare oceanfront resorts in Maui",
    "Compare the top hotels in New York City",
    "Compare beach resorts in the Maldives",
  ],
  [
    "Boutique hotels in Paris near the Louvre",
    "Beachfront resorts in Phuket for a family",
    "Grand palace hotels in Rome",
    "Boutique stays on the Amalfi Coast",
    "Charming hotels in Kyoto near the temples",
  ],
  [
    "Overwater villas in the Maldives",
    "Design hotels in Copenhagen",
    "All-inclusive resorts in Cancún",
    "Private-pool villas in Phuket",
    "Ocean-view suites in Cape Town",
  ],
];

export function AirbnbLanding() {
  const savedCount = usePreferences((s) => s.saved.length);
  const { user, isAuthenticated } = useAuth();
  const send = useConversation((s) => s.send);
  const isStreaming = useConversation((s) => s.isStreaming);
  const [compareOpen, setCompareOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Each pill slot's current index into its column. Start staggered so the row
  // looks varied from the first paint.
  const [pillIdx, setPillIdx] = useState<number[]>([0, 1, 2, 3, 4]);
  const tick = useRef(0);

  // Every ~1.8s, advance ONE pill (round-robin) so they change one at a time.
  useEffect(() => {
    const iv = setInterval(() => {
      setPillIdx((cur) => {
        const slot = tick.current % PILL_COLUMNS.length;
        tick.current += 1;
        const next = [...cur];
        next[slot] = (next[slot] + 1) % PILL_COLUMNS[slot].length;
        return next;
      });
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-[#222]">
      {/* Background image — different art for mobile vs desktop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-white bg-cover bg-center bg-no-repeat md:hidden"
        style={{ backgroundImage: `url("${BG_MOBILE}")` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden bg-white bg-cover bg-center bg-no-repeat md:block"
        style={{ backgroundImage: `url("${BG_DESKTOP}")` }}
      />
      {/* Soft scrim so the headline + chat box stay readable over any image */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-white/35" />

      {/* HEADER — minimal, glassy over the image */}
      <header className="border-b border-white/30 bg-white/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto max-w-none" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
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

          {/* Example prompts — each pill flips on its own; height is reserved so
              the page below never shifts when a pill changes. */}
          <div className="mx-auto mt-5 flex min-h-[4.5rem] max-w-xl flex-wrap content-center items-center justify-center gap-2">
            {PILL_COLUMNS.map((col, i) => {
              const text = col[pillIdx[i]];
              return (
                <AnimatePresence key={i} mode="popLayout" initial={false}>
                  <motion.button
                    key={text}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.94 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    onClick={() => !isStreaming && send(text)}
                    disabled={isStreaming}
                    className="rounded-full border border-[#EBEBEB] bg-white px-3.5 py-1.5 text-xs text-[#555] transition-colors hover:border-[#DDDDDD] hover:text-[#222] disabled:opacity-50"
                  >
                    {text}
                  </motion.button>
                </AnimatePresence>
              );
            })}
          </div>

          {/* Secondary actions: live voice (behind VOICE_FEATURES) + compare */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {VOICE_FEATURES && (
              <button
                onClick={() => setVoiceOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(255,56,92,0.6)] transition-transform hover:scale-[1.03]"
              >
                <Mic className="size-4" strokeWidth={2.5} /> Talk to the advisor live
              </button>
            )}
            <button
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#717171] transition-colors hover:text-[#FF385C]"
            >
              <Scale className="size-4" strokeWidth={2} /> Compare hotels side by side
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/30 bg-white/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-2 px-6 py-6 text-sm text-[#555] sm:flex-row sm:items-center">
          <span>© 2026 WhataHotel · Lorraine Travel</span>
          <span className="flex gap-5">
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/saved" className="hover:underline">Saved</Link>
          </span>
        </div>
      </footer>

      <CompareWizard open={compareOpen} onClose={() => setCompareOpen(false)} cities={[]} />
      {VOICE_FEATURES && voiceOpen && <RealtimeVoice onClose={() => setVoiceOpen(false)} />}
    </div>
  );
}
