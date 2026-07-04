import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";

const box = "animate-pulse rounded bg-black/[0.06]";

/**
 * Content-shaped skeleton for a hotel page. The URL flips instantly on
 * navigation and the guest sees the gallery / title / body silhouette while the
 * server loads details, images and advisor perks.
 */
export default function HotelLoading() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <div className="container py-8">
        <span className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/40">
          <ArrowLeft className="size-4" /> Back to your advisor
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
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <div className={`h-3 w-24 ${box}`} />
            <div className={`h-10 w-72 ${box} md:w-96`} />
            <div className={`h-4 w-56 ${box}`} />
          </div>
          <div className="space-y-2 text-right">
            <div className={`ml-auto h-4 w-24 ${box}`} />
            <div className={`ml-auto h-4 w-40 ${box}`} />
          </div>
        </div>

        {/* Body: left content + right booking rail */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          <div className="space-y-10">
            <section className="space-y-4">
              <div className={`h-6 w-40 ${box}`} />
              <div className={`h-4 w-full max-w-2xl ${box}`} />
              <div className={`h-4 w-11/12 max-w-2xl ${box}`} />
              <div className={`h-4 w-4/5 max-w-2xl ${box}`} />
              <div className="mt-6 flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-8 w-28 rounded-full ${box}`} />
                ))}
              </div>
            </section>
            <section className="space-y-4">
              <div className={`h-6 w-48 ${box}`} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`h-12 rounded-xl ${box}`} />
                ))}
              </div>
            </section>
            {/* Rooms */}
            <section className="space-y-4">
              <div className={`h-6 w-56 ${box}`} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`h-28 rounded-2xl ${box}`} />
              ))}
            </section>
          </div>

          {/* Sticky booking / advisor rail */}
          <aside className="space-y-4">
            <div className={`h-64 rounded-3xl ${box}`} />
            <div className={`h-40 rounded-3xl ${box}`} />
          </aside>
        </div>
      </div>
    </main>
  );
}
