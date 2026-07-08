import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ComparisonView } from "@/components/compare/comparison-view";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Search = { a?: string; b?: string; c?: string; checkIn?: string; checkOut?: string };
type Params = { searchParams: Promise<Search> };

export const metadata: Metadata = {
  title: "Compare hotels — WhataHotel",
};

export default async function ComparePage({ searchParams }: Params) {
  const { a, b, c, checkIn = "", checkOut = "" } = await searchParams;
  if (!a || !b) notFound();
  const ids = [a, b, c].filter((x): x is string => Boolean(x));

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-[#f7f7f7]">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Side-by-side comparison</h1>
        <ComparisonView hotelIds={ids} checkIn={checkIn} checkOut={checkOut} />
      </main>
    </div>
  );
}
