import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ComparisonView, resolveComparisonHotel } from "@/components/compare/comparison-view";
import { ShareOfferButton } from "@/components/compare/share-offer-button";
import { ShareComparisonButton } from "@/components/compare/share-comparison-button";
import { CompareDateBar } from "@/components/compare/compare-date-bar";
import { BeachAlertFor } from "@/components/chat/beach-alert-for";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

type Search = { a?: string; b?: string; c?: string; checkIn?: string; checkOut?: string };
type Params = { searchParams: Promise<Search> };

export const metadata: Metadata = {
  title: "Compare hotels — WhataHotel",
};

export default async function ComparePage({ searchParams }: Params) {
  const { a, b, c, checkIn = "", checkOut = "" } = await searchParams;
  if (!a || !b) notFound();
  const ids = [a, b, c].filter((x): x is string => Boolean(x));

  // Only the advisor gets the "share as an offer" shortcut.
  const me = await getCurrentUser();
  const isAdmin = Boolean(me && me.email.toLowerCase() === ADMIN_EMAIL);

  // Cities of the compared hotels — used for the "share as offer" flow and to
  // surface a sargassum warning for each coastal destination being compared.
  const resolved = await Promise.all(ids.map((id) => resolveComparisonHotel(id)));
  const cities = Array.from(
    new Set(resolved.map((h) => h?.city).filter((c): c is string => Boolean(c))),
  );
  const city = isAdmin ? cities[0] ?? "" : "";

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Side-by-side comparison</h1>
          {/* Everyone can share; advisors get the richer "create a branded offer" flow. */}
          {isAdmin ? (
            <ShareOfferButton hotelIds={ids} city={city} checkIn={checkIn} checkOut={checkOut} />
          ) : (
            <ShareComparisonButton hotelIds={ids} checkIn={checkIn} checkOut={checkOut} />
          )}
        </div>
        <CompareDateBar hotelIds={ids} checkIn={checkIn} checkOut={checkOut} />
        {cities.length > 0 && (
          <div className="mt-4 space-y-2">
            {cities.map((c) => (
              <BeachAlertFor key={c} destination={c} />
            ))}
          </div>
        )}
        <ComparisonView hotelIds={ids} checkIn={checkIn} checkOut={checkOut} />
      </main>
    </div>
  );
}
