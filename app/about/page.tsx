import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Compass,
  ShieldCheck,
  Gem,
  HeartHandshake,
  MessagesSquare,
  BadgeCheck,
  Globe2,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About WhataHotel — Your AI Luxury Travel Advisor",
  description:
    "WhataHotel pairs the warmth of an expert travel advisor with the intelligence of AI — curating the world's finest hotels, explaining every choice, and securing advisor-exclusive perks.",
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Honesty first",
    body: "We recommend what's right for you — not what pays the most. Every suggestion comes with the real reason behind it, trade-offs included.",
  },
  {
    icon: Compass,
    title: "Genuine expertise",
    body: "Our recommendations draw on deep destination knowledge and hand-vetted properties, so you get an insider's judgement, not a search ranking.",
  },
  {
    icon: HeartHandshake,
    title: "Quietly personal",
    body: "We remember the occasion, the budget, the small preferences — and shape the whole trip around how you want to feel.",
  },
  {
    icon: Gem,
    title: "Exclusive value",
    body: "Advisor-exclusive perks — upgrades, breakfast, spa credits, late checkout — included at no extra cost, because relationships matter.",
  },
];

const TRUST = [
  { icon: BadgeCheck, label: "Advisor perks included" },
  { icon: Globe2, label: "Hand-vetted hotels worldwide" },
  { icon: MessagesSquare, label: "No booking fees, ever" },
];

export default function AboutPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />

      {/* Hero */}
      <section className="container pt-16 pb-12 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
          About WhataHotel
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-light leading-[1.08] tracking-tight md:text-6xl">
          Travel should feel like a{" "}
          <span className="text-gradient-gold italic">conversation</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/75">
          We built WhataHotel for a simple reason: booking a beautiful hotel had
          become a chore of tabs, filters, and fake urgency. We believe planning
          the finest trips of your life should feel like talking to someone who
          knows you — and knows the world's great hotels by heart.
        </p>
      </section>

      {/* Story */}
      <section className="container py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-medium">Our story</h2>
          <div className="mt-5 space-y-4 text-[17px] leading-[1.8] text-foreground/80">
            <p>
              The best travel decisions have always been made in conversation —
              with a trusted advisor who asks the right questions, listens
              closely, and returns with options that feel as though they were
              chosen just for you. That experience was reserved for a privileged
              few, and the rest of us were left to the impersonal grind of the
              online travel agencies.
            </p>
            <p>
              WhataHotel exists to change that. We pair the warmth and judgement
              of an expert luxury travel advisor with the speed and recall of
              artificial intelligence. The result is an advisor that's available
              the moment inspiration strikes, remembers everything you tell it,
              and guides you all the way from a vague daydream to a confirmed
              booking — complete with perks you'd never find on a booking site.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container py-12">
        <div className="mx-auto max-w-4xl rounded-3xl glass-strong p-8 text-center shadow-card md:p-12">
          <Sparkles className="mx-auto size-6 text-primary" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-2xl font-light leading-snug md:text-3xl">
            Our mission is to make the world's finest hotels feel personal,
            accessible, and effortless — guiding every traveller from{" "}
            <span className="text-gradient-gold italic">inspiration to booking</span>{" "}
            through conversation.
          </h2>
        </div>
      </section>

      {/* Values */}
      <section className="container py-12">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            What we stand for
          </p>
          <h2 className="mt-3 font-display text-3xl font-light md:text-4xl">
            Our <span className="text-gradient-gold italic">values</span>
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-3xl glass-strong p-6 shadow-card">
              <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <v.icon className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="font-display text-lg font-medium">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/72">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Expertise */}
      <section className="container py-12">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
              What makes us different
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">
              The judgement of an advisor, the recall of AI
            </h2>
            <div className="mt-5 space-y-4 leading-relaxed text-foreground/80">
              <p>
                Traditional booking sites optimise for volume. A great advisor
                optimises for you. WhataHotel brings the two together: an
                intelligent advisor that understands natural language, asks smart
                follow-up questions, and never forgets a detail you've shared.
              </p>
              <p>
                Behind the conversation sits a curated collection of the world's
                finest hotels and the advisor-exclusive perks that come with
                them. You get honest recommendations, the reasoning behind each
                one, and genuine added value — all without the forms.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              {
                icon: MessagesSquare,
                title: "Conversation, not forms",
                body: "Describe your trip in plain words. No dropdowns, no endless filters.",
              },
              {
                icon: Compass,
                title: "Explained recommendations",
                body: "Every hotel comes with a clear, human reason it was chosen for you.",
              },
              {
                icon: Gem,
                title: "Advisor-exclusive perks",
                body: "Upgrades, breakfast, and credits included — at no extra cost.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-2xl glass-strong p-5 shadow-sm"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="font-display text-base font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/72">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="container py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Our travel philosophy
          </p>
          <blockquote className="mt-5 font-display text-2xl font-light italic leading-relaxed text-foreground/85 md:text-3xl">
            &ldquo;The finest journeys aren&apos;t measured in countries
            collected, but in moments that stay with you. We plan for the
            moments.&rdquo;
          </blockquote>
          <p className="mt-6 leading-relaxed text-foreground/75">
            We champion travelling well over travelling fast — staying longer,
            choosing properties with a real sense of place, and leaving room for
            the unplanned. You can read more of how we think in{" "}
            <Link
              href="/journal/art-of-slow-travel"
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
            >
              The Art of Slow Travel
            </Link>{" "}
            and across{" "}
            <Link
              href="/journal"
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
            >
              our Journal
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="container py-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-3xl border border-primary/15 bg-secondary/60 px-6 py-7">
          {TRUST.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-2.5 text-sm font-medium text-foreground/80"
            >
              <t.icon className="size-5 text-primary" strokeWidth={1.5} />
              {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <h2 className="font-display text-3xl font-light md:text-4xl">
          Let&apos;s plan something{" "}
          <span className="text-gradient-gold italic">extraordinary</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-foreground/75">
          Tell our advisor how you want to feel. From a weekend in Paris to a
          month in the islands, the conversation starts here.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Start the conversation</Link>
        </Button>
      </section>

      <SiteFooter />
    </main>
  );
}
