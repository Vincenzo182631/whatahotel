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
import { Badge } from "@/components/ui/badge";

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
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {hotel.brand && (
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">
                {hotel.brand}
              </p>
            )}
            <h1 className="mt-1 font-display text-4xl font-light md:text-5xl">
              {hotel.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-foreground/72">
              <MapPin className="size-4 text-primary" />
              {hotel.neighborhood && hotel.neighborhood !== hotel.city
                ? `${hotel.neighborhood} · ${hotel.city}, ${hotel.country}`
                : `${hotel.city}, ${hotel.country}`}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-primary text-primary" strokeWidth={1.5} />
              ))}
            </span>
            <p className="mt-2 font-display text-lg text-gradient-gold">
              Live rates for your dates
            </p>
            <p className="text-xs text-foreground/65">Pick dates below for live pricing</p>
          </div>
        </div>

        {/* Body */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-10">
            <section>
              <h2 className="font-display text-2xl font-medium">The story</h2>
              <p className="mt-3 leading-relaxed text-foreground/75">
                {hotel.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {hotel.highlights.map((h) => (
                  <Badge key={h} variant="muted">
                    <Check className="size-3 text-primary" /> {h}
                  </Badge>
                ))}
              </div>
            </section>

            {hotel.amenities.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-medium">Amenities</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {hotel.amenities.map((a) => {
                    const meta = AMENITY_META[a];
                    if (!meta) return null;
                    return (
                      <div
                        key={a}
                        className="flex items-center gap-2.5 rounded-2xl glass px-4 py-3 text-sm"
                      >
                        <meta.icon className="size-4 text-primary" />
                        {meta.label}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="flex items-center gap-2 font-display text-2xl font-medium">
                <Gift className="size-5 text-primary" /> Advisor-exclusive perks
              </h2>
              <ul className="mt-4 space-y-2.5">
                {perks.map((perk) => (
                  <li
                    key={perk.id}
                    className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{perk.label}</span>
                      <span className="text-foreground/72"> — {perk.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {hotel.distances.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-medium">
                  Getting around
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {hotel.distances.map((d) => (
                    <div key={d.label} className="rounded-2xl glass p-4">
                      <p className="text-sm text-foreground/72">{d.label}</p>
                      <p className="mt-1 font-display text-lg">{d.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-2xl font-medium">
                Rooms & availability
              </h2>
              <div className="mt-4">
                <RoomsSection hotelId={hotel.id} />
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
