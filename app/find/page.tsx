import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { LiveSearch } from "@/components/search/live-search";

export const metadata: Metadata = {
  title: "Find any hotel — WhataHotel",
  description: "Search every WhataHotel property worldwide with live rates and advisor perks.",
};

export default function FindPage() {
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
      <LiveSearch />
    </div>
  );
}
