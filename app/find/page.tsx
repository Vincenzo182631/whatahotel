import Link from "next/link";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { AdvancedSearchForm } from "@/components/search/advanced-search-form";
import { CompareBar } from "@/components/chat/compare-bar";

export const metadata: Metadata = {
  title: "Search & compare hotels — WhataHotel",
  description: "Structured multi-city hotel search — up to 3 cities, brands, amenities and preferences, with the best matches per destination.",
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
          <BackButton fallback="/" />
        </div>
      </header>
      <AdvancedSearchForm />
      {/* Floating "Compare N hotels" tray — appears when hotels are selected. */}
      <CompareBar />
    </div>
  );
}
