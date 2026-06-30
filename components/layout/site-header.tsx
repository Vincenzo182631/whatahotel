"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { usePreferences } from "@/store/preferences-store";

export function SiteHeader() {
  const savedCount = usePreferences((s) => s.saved.length);

  return (
    <header className="sticky top-0 z-30 h-[4.5rem] w-full">
      <div className="glass-strong h-full border-b border-black/[0.06]">
        <div className="container relative flex h-full items-center justify-between">
          <Link href="/" className="group flex items-center" aria-label="What a Hotel — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-9 w-auto max-w-none" />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {[
              { label: "Home", href: "/" },
              { label: "Journal", href: "#" },
              { label: "About", href: "#" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm text-foreground/70 transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-foreground/70 lg:inline-flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              AI advisor online
            </span>
            <Link
              href="/saved"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground"
            >
              <Heart className="size-4" />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-gold-sheen text-[11px] font-semibold text-white">
                  {savedCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
