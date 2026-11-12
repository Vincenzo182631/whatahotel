"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BedDouble, Loader2, Sparkles, Tag } from "lucide-react";
import { useTravelDates } from "@/store/travel-dates-store";
import { TravelDatesBar } from "@/components/search/travel-dates-bar";
import { LogComparison } from "@/components/compare/log-comparison";
import { cn } from "@/lib/utils";

export interface DuelHotel {
  id: string;
  name: string;
  /** The hotel's own page (rooms, photos, booking). */
  href: string;
}

interface RatesResponse {
  live: boolean;
  nights: number;
  currency: string;
  entryNightly: number;
  total: number;
  rooms: { name: string; nightly: number; total: number; bookingURL?: string }[];
  perks: { id: string; label: string }[];
}

type Result = { status: "loading" } | { status: "error" } | { status: "ok"; data: RatesResponse };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * Source room names can be noisy ("Superior Room Superior Room 35SQM 375SQF
 * King bed Twin be ds"): drop a repeated leading phrase and anything from the
 * first size figure on.
 */
export function tidyRoomName(raw: string): string {
  let name = raw.replace(/\s+/g, " ").trim();
  const words = name.split(" ");
  for (let n = Math.floor(words.length / 2); n >= 1; n--) {
    if (words.slice(0, n).join(" ").toLowerCase() === words.slice(n, 2 * n).join(" ").toLowerCase()) {
      name = [...words.slice(0, n), ...words.slice(2 * n)].join(" ");
      break;
    }
  }
  const size = name.search(/\s\d+\s*(sqm|sqf|sq\.?\s?m|sq\.?\s?ft|m²|m2)\b/i);
  return (size > 0 ? name.slice(0, size) : name).trim() || raw;
}

/** One-tap date presets, so nobody has to fiddle with a calendar to see a price. */
function presets(): { label: string; checkIn: string; checkOut: string }[] {
  const today = new Date();
  // The coming Friday, unless it's under 3 days away — then the one after.
  const toFriday = (5 - today.getDay() + 7) % 7;
  const friday = addDays(today, toFriday < 3 ? toFriday + 7 : toFriday);
  const inMonth = addDays(today, 30);
  const inThreeMonths = addDays(today, 90);
  return [
    { label: "Next weekend", checkIn: iso(friday), checkOut: iso(addDays(friday, 2)) },
    { label: "3 nights next month", checkIn: iso(inMonth), checkOut: iso(addDays(inMonth, 3)) },
    { label: "A week in 3 months", checkIn: iso(inThreeMonths), checkOut: iso(addDays(inThreeMonths, 7)) },
  ];
}

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

/**
 * Live, date-specific prices for both hotels in a comparison, side by side:
 * which is cheaper and by how much, the entry room, perks, and a direct path
 * to book. Dates are the app-wide remembered dates, so they carry through to
 * the hotel pages and booking.
 */
export function LiveRateDuel({ a, b, city }: { a: DuelHotel; b: DuelHotel; city?: string }) {
  const { checkIn, checkOut, setDates } = useTravelDates();
  const [hydrated, setHydrated] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const hasDates = hydrated && Boolean(checkIn && checkOut && checkOut > checkIn);
  const quick = useMemo(presets, []);

  // Dates come from localStorage; wait for it so we don't flash "add dates".
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hasDates) return;
    let cancelled = false;
    // The source occasionally drops one of two simultaneous requests, so a
    // "no rate" answer is retried once after a short pause before we show it.
    const load = (h: DuelHotel, attempt: number) => {
      const q = new URLSearchParams({ id: h.id, checkIn, checkOut, guests: "2" });
      fetch(`/api/rates?${q}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data: RatesResponse) => {
          if (cancelled) return;
          if (!(data.live && data.entryNightly > 0) && attempt === 0) {
            setTimeout(() => !cancelled && load(h, 1), 1500);
            return;
          }
          setResults((r) => ({ ...r, [h.id]: { status: "ok", data } }));
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt === 0) setTimeout(() => !cancelled && load(h, 1), 1500);
          else setResults((r) => ({ ...r, [h.id]: { status: "error" } }));
        });
    };
    for (const h of [a, b]) {
      setResults((r) => ({ ...r, [h.id]: { status: "loading" } }));
      load(h, 0);
    }
    return () => {
      cancelled = true;
    };
  }, [a, b, checkIn, checkOut, hasDates]);

  const priced = (h: DuelHotel) => {
    const r = results[h.id];
    return r?.status === "ok" && r.data.live && r.data.entryNightly > 0 ? r.data : null;
  };
  const pa = priced(a);
  const pb = priced(b);
  // Only call a winner when both prices are live and in the same currency.
  const cheaper =
    pa && pb && pa.currency === pb.currency && pa.entryNightly !== pb.entryNightly
      ? pa.entryNightly < pb.entryNightly
        ? a.id
        : b.id
      : null;
  const saving = cheaper && pa && pb ? Math.abs(pa.total - pb.total) : 0;

  const liveCompare = `/compare?${new URLSearchParams({
    a: a.id,
    b: b.id,
    ...(hasDates ? { checkIn, checkOut } : {}),
  })}`;

  return (
    <section id="live-prices" className="mt-8 scroll-mt-24">
      <h2 className="text-lg font-semibold">Live prices for your dates</h2>
      <p className="mt-1 text-sm text-[#717171]">
        Real advisor rates, with complimentary perks included.
      </p>

      <TravelDatesBar className="mt-3" />
      {hydrated && !hasDates && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDates(p.checkIn, p.checkOut)}
              className="rounded-full border border-[#DDDDDD] px-3.5 py-1.5 text-sm font-medium hover:border-[#FF385C] hover:text-[#FF385C]"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {hasDates && (
        <>
          <LogComparison a={a.id} b={b.id} checkIn={checkIn} checkOut={checkOut} city={city} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[a, b].map((h) => {
              const r = results[h.id];
              const data = r?.status === "ok" ? r.data : null;
              const live = data?.live && data.entryNightly > 0 ? data : null;
              const room = live?.rooms.length
                ? [...live.rooms].sort((x, y) => x.nightly - y.nightly)[0]
                : null;
              const isCheaper = cheaper === h.id;
              return (
                <div
                  key={h.id}
                  className={cn(
                    "flex flex-col rounded-2xl border p-4",
                    isCheaper ? "border-[#FF385C] ring-1 ring-[#FF385C]/30" : "border-[#EBEBEB]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{h.name}</p>
                    {isCheaper && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FF385C] px-2.5 py-0.5 text-xs font-semibold text-white">
                        <Tag className="size-3" /> Lower price
                      </span>
                    )}
                  </div>

                  {!r || r.status === "loading" ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-[#717171]">
                      <Loader2 className="size-4 animate-spin" /> Checking live rates…
                    </p>
                  ) : live ? (
                    <>
                      <p className="mt-3 text-2xl font-semibold">
                        {money(live.entryNightly, live.currency)}
                        <span className="text-sm font-normal text-[#717171]"> / night</span>
                      </p>
                      <p className="text-sm text-[#717171]">
                        {money(live.total, live.currency)} total · {live.nights} night{live.nights === 1 ? "" : "s"}
                      </p>
                      {isCheaper && saving > 0 && (
                        <p className="mt-1 text-sm font-medium text-[#FF385C]">
                          Saves {money(saving, live.currency)} on this stay
                        </p>
                      )}
                      {room && (
                        <p className="mt-2 flex gap-1.5 text-sm text-[#444]">
                          <BedDouble className="mt-0.5 size-4 shrink-0 text-[#FF385C]" />
                          <span className="line-clamp-2">{tidyRoomName(room.name)}</span>
                        </p>
                      )}
                      {live.perks.length > 0 && (
                        <p className="mt-1 flex gap-1.5 text-sm text-[#444]">
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-[#FF385C]" />
                          {live.perks.length} complimentary perk{live.perks.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-[#717171]">
                      {r.status === "error"
                        ? "Live rates are unavailable right now — try again shortly."
                        : "No live rate for these dates — rate on request. Try other dates or ask the advisor."}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {room?.bookingURL && (
                      <a
                        href={room.bookingURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Book this rate <ArrowUpRight className="size-3.5" />
                      </a>
                    )}
                    <Link
                      href={h.href}
                      className="inline-flex items-center gap-1 rounded-full border border-[#DDDDDD] px-4 py-2 text-sm font-semibold hover:border-[#FF385C]"
                    >
                      See all rooms
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href={liveCompare}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#FF385C] hover:underline"
          >
            Compare every room side by side, with the advisor <ArrowUpRight className="size-3.5" />
          </Link>
        </>
      )}
    </section>
  );
}
