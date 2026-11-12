import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — WhataHotel",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center text-[#222]">
      <Link href="/" aria-label="What a Hotel — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="What a Hotel" className="h-9 w-auto" />
      </Link>
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-[#FF385C]">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-sm text-[#717171]">
        The hotel or page you&apos;re looking for may have moved or is no longer listed. Let&apos;s
        get you back to finding a great stay.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Back to home
        </Link>
        <Link href="/find" className="rounded-full border border-[#DDDDDD] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.03]">
          Search &amp; compare hotels
        </Link>
      </div>
    </main>
  );
}
