import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchClient } from "./search-client";

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
