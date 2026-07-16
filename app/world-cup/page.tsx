import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, MapPin, CalendarDays, Sparkles, Clock } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 — Latest Match & Where to Stay | WhataHotel",
  description:
    "The latest FIFA World Cup 2026 results, the final matchup, and where to stay across the host cities — curated by the WhataHotel advisory team.",
};

/**
 * The tournament state, hand-updated after each match day.
 * As of 16 July 2026 both semi-finals are played; the final is set for 19 July.
 */

const LATEST_MATCH = {
  stage: "Semi-final",
  date: "July 15, 2026",
  venue: "AT&T Stadium · Dallas",
  home: { team: "Argentina", flag: "🇦🇷", score: 2 },
  away: { team: "England", flag: "🏴", score: 1 },
  note: "Argentina reach a second consecutive final, edging England in a tense knockout.",
};

const FINAL = {
  date: "Sunday, July 19, 2026 · 3:00 PM ET",
  venue: "MetLife Stadium · New York / New Jersey",
  a: { team: "Argentina", flag: "🇦🇷" },
  b: { team: "Spain", flag: "🇪🇸" },
};

const RECENT_RESULTS = [
  {
    stage: "Semi-final",
    date: "Jul 15",
    home: { team: "Argentina", flag: "🇦🇷", score: 2 },
    away: { team: "England", flag: "🏴", score: 1 },
  },
  {
    stage: "Semi-final",
    date: "Jul 14",
    home: { team: "Spain", flag: "🇪🇸", score: 2 },
    away: { team: "France", flag: "🇫🇷", score: 0 },
  },
];

const HOST_CITIES = [
  { city: "New York / New Jersey", note: "Hosts the final at MetLife Stadium" },
  { city: "Dallas", note: "Semi-final host at AT&T Stadium" },
  { city: "Los Angeles", note: "West-coast group & knockout matches" },
  { city: "Mexico City", note: "Iconic Estadio Azteca fixtures" },
];

export default function WorldCupPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />

      {/* Hero */}
      <section className="container pt-16 pb-10 text-center">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary/80">
          <Trophy className="size-3.5" strokeWidth={1.5} /> FIFA World Cup 2026
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-light leading-[1.08] tracking-tight md:text-6xl">
          The world&apos;s game, and{" "}
          <span className="text-gradient-gold italic">where to stay</span> for it
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/75">
          Canada, Mexico &amp; the USA are hosting the largest World Cup ever. Here&apos;s
          the latest from the pitch — and the finest places to stay in every host
          city, curated by your WhataHotel advisor.
        </p>
      </section>

      {/* Latest match */}
      <section className="container py-8">
        <div className="mb-5 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Latest result
          </p>
        </div>
        <div className="mx-auto max-w-3xl rounded-3xl glass-strong p-8 shadow-card md:p-10">
          <div className="flex items-center justify-center gap-3 text-xs text-foreground/60">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium uppercase tracking-wider text-primary">
              {LATEST_MATCH.stage}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" strokeWidth={1.5} /> {LATEST_MATCH.date}
            </span>
          </div>

          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-center">
              <div className="text-4xl md:text-5xl">{LATEST_MATCH.home.flag}</div>
              <div className="mt-2 font-display text-lg font-medium md:text-xl">
                {LATEST_MATCH.home.team}
              </div>
            </div>
            <div className="text-center font-display text-4xl font-light tracking-tight md:text-6xl">
              {LATEST_MATCH.home.score}
              <span className="mx-2 text-foreground/40">–</span>
              {LATEST_MATCH.away.score}
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl">{LATEST_MATCH.away.flag}</div>
              <div className="mt-2 font-display text-lg font-medium md:text-xl">
                {LATEST_MATCH.away.team}
              </div>
            </div>
          </div>

          <p className="mt-7 text-center text-sm leading-relaxed text-foreground/70">
            {LATEST_MATCH.note}
          </p>
          <p className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-xs text-foreground/55">
            <MapPin className="size-3.5" strokeWidth={1.5} /> {LATEST_MATCH.venue}
          </p>
        </div>
      </section>

      {/* The final */}
      <section className="container py-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-primary/20 bg-secondary/60 p-8 text-center shadow-card md:p-12">
          <Sparkles className="mx-auto size-6 text-primary" strokeWidth={1.5} />
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-primary/80">
            The Final
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
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-primary" strokeWidth={1.5} /> {FINAL.date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" strokeWidth={1.5} /> {FINAL.venue}
            </span>
          </div>
          <Button asChild size="lg" className="mt-8">
            <Link href="/">Find a stay for the final</Link>
          </Button>
        </div>
      </section>

      {/* Recent results */}
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
          {RECENT_RESULTS.map((m) => (
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

      {/* Where to stay */}
      <section className="container py-10">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Host cities
          </p>
          <h2 className="mt-3 font-display text-3xl font-light md:text-4xl">
            Where to <span className="text-gradient-gold italic">stay</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground/72">
            Tell our advisor the match you&apos;re chasing — we&apos;ll find the right
            hotel nearby, with advisor-exclusive perks included.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOST_CITIES.map((h) => (
            <Link
              key={h.city}
              href="/"
              className="group flex flex-col rounded-3xl glass-strong p-6 shadow-card transition-transform hover:-translate-y-0.5"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 font-display text-lg font-medium">{h.city}</h3>
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
