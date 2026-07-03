import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Star, MapPin, Gift, Check } from "lucide-react";
import {
  hotelDetailsService,
  imagesService,
  advisorPerksService,
} from "@/lib/services";
import { SiteHeader } from "@/components/layout/site-header";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { DockedAdvisor } from "@/components/hotel/docked-advisor";
import { RoomsSection } from "@/components/hotel/rooms-section";
import { TrackView } from "@/components/hotel/track-view";
import { AMENITY_META } from "@/components/hotel/amenity-meta";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const hotel = await hotelDetailsService.getHotelById(id);
  if (!hotel) return { title: "Hotel not found — WhataHotel" };
  return {
    title: `${hotel.name} — WhataHotel`,
    description: hotel.shortPitch,
  };
}

export default async function HotelPage({ params }: Params) {
  const { id } = await params;
  const hotel = await hotelDetailsService.getHotelById(id);
  if (!hotel) notFound();

  const gallery = imagesService.getGallery(hotel);
  const perks = await advisorPerksService.getPerks(id);

  return (
    <main className="min-h-dvh">
      <TrackView
        hotel={{
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          image: hotel.image,
          startingRate: hotel.startingRate,
        }}
      />
      <SiteHeader />

      <div className="container py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/72 transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to your advisor
        </Link>

        {/* Gallery */}
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative h-[320px] overflow-hidden rounded-3xl md:h-[440px]">
            <ImageWithFallback
              src={gallery[0]}
              seed={hotel.id}
              alt={hotel.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent" />
          </div>
          <div className="grid grid-rows-2 gap-3">
            {gallery.slice(1, 3).map((src, i) => (
              <div
                key={i}
                className="relative hidden h-[214px] overflow-hidden rounded-3xl md:block"
              >
                <ImageWithFallback
                  src={src}
                  seed={`${hotel.id}-${i}`}
                  alt={`${hotel.name} ${i + 2}`}
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            {hotel.brand && (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9a9a9a]">
                {hotel.brand}
              </p>
            )}
            <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-[#1a1a1a] md:text-5xl">
              {hotel.name}
            </h1>
            <p className="mt-2.5 flex items-center gap-1.5 text-[#717171]">
              <MapPin className="size-4 text-primary" />
              {hotel.neighborhood && hotel.neighborhood !== hotel.city
                ? `${hotel.neighborhood} · ${hotel.city}, ${hotel.country}`
                : `${hotel.city}, ${hotel.country}`}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-0.5">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="size-4 fill-[#1a1a1a] text-[#1a1a1a]" strokeWidth={0} />
              ))}
            </span>
            <p className="mt-2 text-base font-medium text-[#1a1a1a]">Live rates for your dates</p>
            <p className="text-xs text-[#9a9a9a]">Pick dates below for live pricing</p>
          </div>
        </div>

        {/* Body */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          <div className="space-y-14">
            <section>
              <h2 className="font-display text-2xl font-medium text-[#1a1a1a]">The story</h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-[#555]">
                {hotel.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {hotel.highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[13px] text-[#555]"
                  >
                    <Check className="size-3 text-[#1a1a1a]/60" /> {h}
                  </span>
                ))}
              </div>
            </section>

            {hotel.amenities.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-medium text-[#1a1a1a]">Amenities</h2>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {hotel.amenities.map((a) => {
                    const meta = AMENITY_META[a];
                    if (!meta) return null;
                    return (
                      <div
                        key={a}
                        className="flex items-center gap-2.5 rounded-xl border border-black/[0.07] bg-white px-4 py-3 text-sm text-[#333]"
                      >
                        <meta.icon className="size-4 text-[#717171]" strokeWidth={1.75} />
                        {meta.label}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="flex items-center gap-2 font-display text-2xl font-medium text-[#1a1a1a]">
                <Gift className="size-5 text-primary" /> Advisor-exclusive perks
              </h2>
              <p className="mt-1.5 text-sm text-[#9a9a9a]">Complimentary with every WhataHotel booking.</p>
              <ul className="mt-5 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
                {perks.map((perk) => (
                  <li key={perk.id} className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10">
                      <Check className="size-3 text-primary" strokeWidth={2.5} />
                    </span>
                    <span className="text-[15px] leading-relaxed">
                      <span className="font-medium text-[#1a1a1a]">{perk.label}</span>
                      {perk.detail && <span className="text-[#717171]"> — {perk.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {hotel.distances.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-medium text-[#1a1a1a]">Getting around</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {hotel.distances.map((d) => (
                    <div key={d.label} className="rounded-xl border border-black/[0.07] bg-white p-4">
                      <p className="text-[13px] text-[#9a9a9a]">{d.label}</p>
                      <p className="mt-1 font-display text-lg text-[#1a1a1a]">{d.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-2xl font-medium text-[#1a1a1a]">Rooms &amp; availability</h2>
              <div className="mt-5">
                <RoomsSection
                  hotelId={hotel.id}
                  sourceHotelId={hotel.sourceHotelId}
                  perks={perks.map((p) => ({ label: p.label }))}
                />
              </div>
            </section>
          </div>

          {/* Docked advisor */}
          <aside className="lg:sticky lg:top-[5.5rem] lg:h-fit">
            <DockedAdvisor hotel={hotel} />
          </aside>
        </div>

      </div>
    </main>
  );
}
