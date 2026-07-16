"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/store/preferences-store";
import { useConversation } from "@/store/conversation-store";

export function SiteHeader({ heroMode = false }: { heroMode?: boolean }) {
  const savedCount = usePreferences((s) => s.saved.length);
  const resetConversation = useConversation((s) => s.reset);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Light-on-dark mode: only over the cinematic hero, before scrolling.
  const dark = heroMode && !scrolled;

  return (
    <header className="sticky top-0 z-30 h-[4.5rem] w-full">
      <div
        className={cn(
          "h-full transition-colors duration-300",
          scrolled
            ? "glass-strong border-b border-black/[0.06]"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container relative flex h-full items-center justify-between">
          <Link
            href="/"
            onClick={() => resetConversation()}
            className="group flex items-center"
            aria-label="What a Hotel — home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="What a Hotel"
              className={cn(
                "h-9 w-auto max-w-none transition-all duration-300",
                dark && "brightness-0 invert",
              )}
            />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {[
              { label: "Home", href: "/", home: true },
              { label: "World Cup", href: "/world-cup" },
              { label: "About", href: "/about" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={l.home ? () => resetConversation() : undefined}
                className={cn(
                  "text-sm font-medium transition-colors",
                  dark
                    ? "text-white/85 hover:text-white"
                    : "text-foreground/75 hover:text-primary",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs lg:inline-flex",
                dark
                  ? "border-white/25 bg-white/10 text-white/85 backdrop-blur"
                  : "border-primary/20 bg-primary/5 text-foreground/75",
              )}
            >
              <span className="relative flex size-2">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full",
                    dark ? "bg-white/70" : "bg-primary/60",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    dark ? "bg-white" : "bg-primary",
                  )}
                />
              </span>
              AI advisor online
            </span>
            <Link
              href="/saved"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                dark
                  ? "text-white/85 hover:bg-white/10"
                  : "text-foreground/75 hover:bg-black/[0.04] hover:text-foreground",
              )}
            >
              <Heart className="size-4" strokeWidth={1.5} />
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
