import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { ComparisonView, resolveComparisonHotel } from "@/components/compare/comparison-view";
import { ShareOfferButton } from "@/components/compare/share-offer-button";
import { CompareDateBar } from "@/components/compare/compare-date-bar";
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
  const city = isAdmin ? (await resolveComparisonHotel(ids[0]))?.city ?? "" : "";

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
          <BackButton fallback="/" />
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Side-by-side comparison</h1>
          {isAdmin && (
            <ShareOfferButton hotelIds={ids} city={city} checkIn={checkIn} checkOut={checkOut} />
          )}
        </div>
        <CompareDateBar hotelIds={ids} checkIn={checkIn} checkOut={checkOut} />
        <ComparisonView hotelIds={ids} checkIn={checkIn} checkOut={checkOut} />
      </main>
    </div>
  );
}
