import Link from "next/link";

const LINKS = [
  { label: "About us", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.06]">
      <div className="container py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center" aria-label="What a Hotel — home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="What a Hotel" className="h-10 w-auto max-w-none" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-foreground/55">
              An AI-powered luxury travel advisor. Curated hotels, honest
              recommendations and advisor-exclusive perks — from inspiration to
              booking, in conversation.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm text-foreground/60 transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-black/[0.06] pt-6 text-xs text-foreground/40 sm:flex-row sm:items-center">
          <p>© {2026} WhataHotel. Crafted for travellers with taste.</p>
          <p>Prices and availability powered by WhataHotel's advisor network.</p>
        </div>
      </div>
    </footer>
  );
}
