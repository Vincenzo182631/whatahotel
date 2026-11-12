import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search hotels — WhataHotel",
  description: "Search luxury hotels by city or name and compare them side by side on WhataHotel.",
};

export default function SearchPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <Suspense fallback={null}>
        <SearchClient />
      </Suspense>
    </main>
  );
}
