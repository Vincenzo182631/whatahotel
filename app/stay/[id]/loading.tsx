import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";

const box = "animate-pulse rounded bg-black/[0.06]";

/**
 * Content-shaped skeleton for the stay (booking) page. This page pulls LIVE
 * rates for the guest's dates (force-dynamic, can take a few seconds), so the
 * skeleton keeps the URL responsive and previews the gallery, date picker and
 * booking rail while pricing loads.
 */
export default function StayLoading() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <div className="container py-8">
        <span className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/40">
          <ArrowLeft className="size-4" /> Back
        </span>

        {/* Gallery */}
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className={`h-[320px] rounded-3xl md:h-[440px] ${box}`} />
          <div className="grid grid-rows-2 gap-3">
            <div className={`hidden h-[214px] rounded-3xl md:block ${box}`} />
            <div className={`hidden h-[214px] rounded-3xl md:block ${box}`} />
          </div>
        </div>

        {/* Title */}
        <div className="mt-10 space-y-3">
          <div className={`h-10 w-80 ${box} md:w-[28rem]`} />
          <div className={`h-4 w-64 ${box}`} />
        </div>

        {/* Body: left (dates + rooms) + right booking rail */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          <div className="space-y-8">
            {/* Date picker */}
            <div className={`h-20 rounded-2xl ${box}`} />
            {/* Live room rates loading */}
            <div className="space-y-4">
              <div className={`h-5 w-56 ${box}`} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`h-24 rounded-2xl ${box}`} />
              ))}
            </div>
          </div>

          {/* Booking / advisor rail */}
          <aside className="space-y-4">
            <div className={`h-72 rounded-3xl ${box}`} />
            <div className={`h-40 rounded-3xl ${box}`} />
          </aside>
        </div>
      </div>
    </main>
  );
}
