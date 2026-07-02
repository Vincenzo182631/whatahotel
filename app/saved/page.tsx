"use client";

import Link from "next/link";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/store/preferences-store";

export default function SavedPage() {
  const saved = usePreferences((s) => s.saved);
  const toggleSave = usePreferences((s) => s.toggleSave);

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <div className="container py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/72 transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to your advisor
        </Link>

        <h1 className="font-display text-4xl font-light">
          Your saved <span className="text-gradient-gold">collection</span>
        </h1>
        <p className="mt-2 text-foreground/72">
          The hotels you've fallen for. Ready when you are.
        </p>

        {saved.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl glass-strong p-16 text-center">
            <Heart className="size-10 text-primary/40" />
            <p className="mt-4 font-display text-xl">No saved hotels yet</p>
            <p className="mt-1 max-w-sm text-sm text-foreground/70">
              Tell your advisor what you're dreaming of, then tap the heart on any
              recommendation to keep it here.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/">Start a conversation</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((hotel) => (
              <div
                key={hotel.id}
                className="group overflow-hidden rounded-3xl glass-strong shadow-card"
              >
                <div className="relative h-44 overflow-hidden">
                  <ImageWithFallback
                    src={hotel.image}
                    seed={hotel.id}
                    alt={hotel.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <button
                    onClick={() => toggleSave(hotel)}
                    aria-label="Remove from saved"
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-full glass transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-medium">{hotel.name}</h3>
                  <p className="text-sm text-foreground/70">{hotel.city}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-foreground/70">
                      Live rates for your dates
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/hotel/${hotel.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
