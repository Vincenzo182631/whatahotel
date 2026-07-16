import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, MapPin, CalendarDays, Sparkles, Clock, Train } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 — The Last Two Matches & Where to Stay | WhataHotel",
  description:
    "The final two matches of the 2026 FIFA World Cup — France vs England for third place (Jul 18, Miami) and Argentina vs Spain in the final (Jul 19, MetLife Stadium) — plus where to stay, curated by the WhataHotel advisory team.",
};

/**
 * The tournament state, hand-updated after each match day.
 * As of 16 July 2026 both semi-finals are played and two matches remain:
 * the third-place play-off on 18 July and the final on 19 July. Add the
 * score to THIRD_PLACE / FINAL once each is played.
 */

const THIRD_PLACE = {
  stage: "Third-place play-off",
  date: "Saturday, July 18, 2026",
  kickoff: "5:00 PM ET",
  venue: "Hard Rock Stadium",
  location: "Miami, Florida",
  a: { team: "France", flag: "🇫🇷" },
  b: { team: "England", flag: "🏴" },
  note: "The beaten semi-finalists meet in Miami for the bronze medal.",
};

const FINAL = {
  stage: "The Final",
  date: "Sunday, July 19, 2026",
  kickoff: "3:00 PM ET",
  venue: "MetLife Stadium",
  location: "East Rutherford, New Jersey",
  a: { team: "Argentina", flag: "🇦🇷" },
  b: { team: "Spain", flag: "🇪🇸" },
  note: "Reigning champions Argentina meet 2010 winners Spain — a first World Cup final between the two.",
};

const SEMI_FINALS = [
  {
    stage: "Semi-final",
    date: "Jul 15 · Dallas",
    home: { team: "Argentina", flag: "🇦🇷", score: 2 },
    away: { team: "England", flag: "🏴", score: 1 },
  },
  {
    stage: "Semi-final",
    date: "Jul 14 · New York/NJ",
    home: { team: "Spain", flag: "🇪🇸", score: 2 },
    away: { team: "France", flag: "🇫🇷", score: 0 },
  },
];

// Where to stay for the final — bases around MetLife Stadium (East Rutherford, NJ).
const FINAL_BASES = [
  {
    area: "Midtown Manhattan",
    note: "The classic base — grand hotels, then a direct NJ Transit line to the Meadowlands on match day.",
    transit: "≈ 35 min to the stadium",
  },
  {
    area: "Hoboken & Jersey City",
    note: "Waterfront rooms with a Manhattan skyline, closest of the polished bases to MetLife.",
    transit: "≈ 20 min to the stadium",
  },
  {
    area: "The Meadowlands",
    note: "Stay within sight of the stadium — walk-in convenience for kickoff and the celebrations after.",
    transit: "Walking distance",
  },
];

// Broader 2026 host cities across the three nations.
const HOST_CITIES = [
  { city: "New York / New Jersey", note: "Hosts the final at MetLife Stadium", country: "🇺🇸" },
  { city: "Dallas", note: "Semi-final host at AT&T Stadium", country: "🇺🇸" },
  { city: "Los Angeles", note: "Marquee matches at SoFi Stadium", country: "🇺🇸" },
  { city: "Miami", note: "Third-place play-off host", country: "🇺🇸" },
  { city: "Mexico City", note: "Opening match at the historic Estadio Azteca", country: "🇲🇽" },
  { city: "Guadalajara", note: "Estadio Akron group-stage fixtures", country: "🇲🇽" },
  { city: "Toronto", note: "BMO Field, Canada's opening host", country: "🇨🇦" },
  { city: "Vancouver", note: "BC Place knockout-round matches", country: "🇨🇦" },
];

export default function WorldCupPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />

      {/* Hero */}
      <section className="container pt-16 pb-8 text-center">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary/80">
          <Trophy className="size-3.5" strokeWidth={1.5} /> FIFA World Cup 2026 · Two matches left
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-light leading-[1.08] tracking-tight md:text-6xl">
          It comes down to{" "}
          <span className="text-gradient-gold italic">two matches</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/75">
          France meet England for third place in Miami on July 18, then Argentina
          face Spain at MetLife Stadium on July 19 for the title. Here are the last
          two — and the finest places to stay for them, curated by your WhataHotel
          advisor.
        </p>
      </section>

      {/* The final */}
      <section className="container py-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-primary/20 bg-secondary/60 p-8 text-center shadow-card md:p-12">
          <Sparkles className="mx-auto size-6 text-primary" strokeWidth={1.5} />
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-primary/80">
            {FINAL.stage}
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 md:gap-12">
            <div className="text-center">
              <div className="text-5xl md:text-6xl">{FINAL.a.flag}</div>
              <div className="mt-2 font-display text-xl font-medium md:text-2xl">
                {FINAL.a.team}
              </div>
            </div>
            <span className="font-display text-2xl font-light italic text-foreground/50">
              vs
            </span>
            <div className="text-center">
              <div className="text-5xl md:text-6xl">{FINAL.b.flag}</div>
              <div className="mt-2 font-display text-xl font-medium md:text-2xl">
                {FINAL.b.team}
              </div>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-foreground/70">
            {FINAL.note}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-primary" strokeWidth={1.5} /> {FINAL.date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-primary" strokeWidth={1.5} /> {FINAL.kickoff}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" strokeWidth={1.5} /> {FINAL.venue} · {FINAL.location}
            </span>
          </div>
          <Button asChild size="lg" className="mt-8">
            <Link href="/">Find a stay for the final</Link>
          </Button>
        </div>
      </section>

      {/* Third-place play-off */}
      <section className="container py-8">
        <div className="mx-auto max-w-3xl rounded-3xl glass-strong p-7 shadow-card md:p-9">
          <div className="flex items-center justify-center gap-3 text-xs text-foreground/60">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium uppercase tracking-wider text-primary">
              {THIRD_PLACE.stage}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" strokeWidth={1.5} /> {THIRD_PLACE.date}
            </span>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-center">
              <div className="text-3xl md:text-4xl">{THIRD_PLACE.a.flag}</div>
              <div className="mt-2 font-display text-base font-medium md:text-lg">
                {THIRD_PLACE.a.team}
              </div>
            </div>
            <span className="text-center font-display text-lg font-light italic text-foreground/50">
              vs
            </span>
            <div className="text-center">
              <div className="text-3xl md:text-4xl">{THIRD_PLACE.b.flag}</div>
              <div className="mt-2 font-display text-base font-medium md:text-lg">
                {THIRD_PLACE.b.team}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" strokeWidth={1.5} /> {THIRD_PLACE.kickoff}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" strokeWidth={1.5} /> {THIRD_PLACE.venue} · {THIRD_PLACE.location}
            </span>
          </div>
        </div>
      </section>

      {/* Where to stay for the final */}
      <section className="container py-10">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Final weekend
          </p>
          <h2 className="mt-3 font-display text-3xl font-light md:text-4xl">
            Where to <span className="text-gradient-gold italic">stay</span> for the final
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground/72">
            Three bases for MetLife Stadium in East Rutherford — from grand
            Manhattan hotels to a room within sight of the pitch.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {FINAL_BASES.map((b) => (
            <Link
              key={b.area}
              href="/"
              className="group flex flex-col rounded-3xl glass-strong p-6 shadow-card transition-transform hover:-translate-y-0.5"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 font-display text-lg font-medium">{b.area}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/72">
                {b.note}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/55">
                <Train className="size-3.5 text-primary" strokeWidth={1.5} /> {b.transit}
              </span>
              <span className="mt-3 text-sm font-medium text-primary">
                Find a stay →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Semi-finals */}
      <section className="container py-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Semi-finals
          </p>
          <h2 className="mt-3 font-display text-3xl font-light md:text-4xl">
            How the <span className="text-gradient-gold italic">finalists</span> got here
          </h2>
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {SEMI_FINALS.map((m) => (
            <div
              key={`${m.home.team}-${m.away.team}`}
              className="rounded-2xl glass-strong p-5 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-foreground/55">
                <span className="font-medium uppercase tracking-wider text-primary/80">
                  {m.stage}
                </span>
                <span>{m.date}</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-xl">{m.home.flag}</span> {m.home.team}
                  </span>
                  <span className="font-display text-lg">{m.home.score}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-xl">{m.away.flag}</span> {m.away.team}
                  </span>
                  <span className="font-display text-lg">{m.away.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Host cities */}
      <section className="container py-10">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Across the tournament
          </p>
          <h2 className="mt-3 font-display text-3xl font-light md:text-4xl">
            The <span className="text-gradient-gold italic">host cities</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground/72">
            Wherever the football takes you across Canada, Mexico and the USA,
            tell our advisor — we&apos;ll find the right hotel nearby.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOST_CITIES.map((h) => (
            <Link
              key={h.city}
              href="/"
              className="group flex flex-col rounded-3xl glass-strong p-6 shadow-card transition-transform hover:-translate-y-0.5"
            >
              <span className="text-2xl">{h.country}</span>
              <h3 className="mt-4 font-display text-lg font-medium">{h.city}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/72">
                {h.note}
              </p>
              <span className="mt-4 text-sm font-medium text-primary">
                Find a stay →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <h2 className="font-display text-3xl font-light md:text-4xl">
          Chasing the <span className="text-gradient-gold italic">final</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-foreground/75">
          Tell our advisor where the football takes you. We&apos;ll handle the
          hotel — the perfect base, near the stadium, with perks on us.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Start the conversation</Link>
        </Button>
      </section>

      <SiteFooter />
    </main>
  );
}
