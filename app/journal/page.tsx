import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { getAllArticles } from "@/lib/journal/articles";

export const metadata: Metadata = {
  title: "The Journal — Luxury Travel Guides & Tips | WhataHotel",
  description:
    "Destination guides, packing tips, and luxury travel inspiration from the WhataHotel advisory team — from Paris and the Maldives to the art of slow travel.",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function JournalPage() {
  const articles = getAllArticles();
  const [featured, ...rest] = articles;

  return (
    <main className="min-h-dvh">
      <SiteHeader />

      <div className="container pb-20 pt-10">
        {/* Page header */}
        <header className="mx-auto max-w-2xl pb-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            The Journal
          </p>
          <h1 className="mt-3 font-display text-4xl font-light leading-tight md:text-5xl">
            Luxury travel,{" "}
            <span className="text-gradient-gold italic">considered</span>
          </h1>
          <p className="mt-4 text-foreground/72">
            Destination guides, packing wisdom, and the philosophy of travelling
            well — curated by the WhataHotel advisory team.
          </p>
        </header>

        {/* Featured */}
        <Link
          href={`/journal/${featured.slug}`}
          className="group grid overflow-hidden rounded-3xl glass-strong shadow-card md:grid-cols-2"
        >
          <div className="relative h-64 overflow-hidden md:h-full md:min-h-[340px]">
            <ImageWithFallback
              src={featured.image}
              seed={featured.slug}
              alt={featured.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center p-7 md:p-10">
            <span className="text-xs uppercase tracking-[0.18em] text-primary/80">
              Featured · {featured.category}
            </span>
            <h2 className="mt-3 font-display text-2xl font-medium leading-tight md:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 leading-relaxed text-foreground/72">
              {featured.excerpt}
            </p>
            <div className="mt-5 flex items-center gap-4 text-xs text-foreground/55">
              <span>{fmtDate(featured.date)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" strokeWidth={1.5} /> {featured.readMinutes} min read
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Read the guide
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </span>
          </div>
        </Link>

        {/* Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (
            <Link
              key={a.slug}
              href={`/journal/${a.slug}`}
              className="group flex flex-col overflow-hidden rounded-3xl glass-strong shadow-card"
            >
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={a.image}
                  seed={a.slug}
                  alt={a.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary backdrop-blur">
                  {a.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-medium leading-snug">
                  {a.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/70">
                  {a.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-foreground/55">
                  <span>{fmtDate(a.date)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" strokeWidth={1.5} /> {a.readMinutes} min
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
