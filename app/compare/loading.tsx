import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";

/**
 * Instant loading state for /compare. With this Suspense boundary the URL flips
 * immediately on navigation and the guest sees a skeleton while the page pulls
 * live rates, room categories and info for each hotel (fetched sequentially to
 * stay under the source API's throttle, so it takes a few seconds).
 */
export default function CompareLoading() {
  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-[#f7f7f7]">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Side-by-side comparison</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-[#717171]">
          <Scale className="size-4 animate-pulse text-[#FF385C]" />
          Pulling live rates, rooms and perks for your hotels…
        </p>

        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: "150px repeat(3, minmax(0, 1fr))" }}>
          {/* Hotel header skeletons */}
          <div />
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-4 pb-4">
              <div className="mb-3 h-28 w-full animate-pulse rounded-xl bg-black/[0.06]" />
              <div className="h-3 w-16 animate-pulse rounded bg-black/[0.06]" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-black/[0.08]" />
            </div>
          ))}

          {/* Metric row skeletons */}
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="contents">
              <div className="border-t border-[#EBEBEB] px-4 py-5">
                <div className="h-3 w-20 animate-pulse rounded bg-black/[0.06]" />
              </div>
              {[0, 1, 2].map((c) => (
                <div key={c} className="border-t border-[#EBEBEB] px-4 py-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-black/[0.06]" />
                  <div className="mt-2 h-3 w-16 animate-pulse rounded bg-black/[0.05]" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
