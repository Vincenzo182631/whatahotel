import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin, Sparkles, UtensilsCrossed, Check } from "lucide-react";
import { getLiveHotel, getLiveRates, getHotelInfo } from "@/lib/services/live-rates";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { CityMap } from "@/components/hotel/city-map";
import { StayDatePicker } from "@/components/search/stay-date-picker";
import { StayBooking } from "@/components/search/stay-booking";
import { DockedAdvisor } from "@/components/hotel/docked-advisor";
import { formatCurrency } from "@/lib/utils";
import type { Hotel } from "@/lib/services/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ checkIn?: string; checkOut?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const hotel = await getLiveHotel(id);
  return { title: hotel ? `${hotel.name} — WhataHotel` : "Hotel — WhataHotel" };
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
  return d > 0 ? d : 0;
}

export default async function StayPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { checkIn = "", checkOut = "" } = await searchParams;

  const hotel = await getLiveHotel(id);
  if (!hotel) notFound();

  const nights = nightsBetween(checkIn, checkOut);
  const [info, rates] = await Promise.all([
    getHotelInfo(hotel.name, hotel.city),
    nights > 0 ? getLiveRates({ sourceHotelId: id, checkIn, checkOut }) : Promise.resolve(null),
  ]);

  const perks = hotel.perks.length ? hotel.perks : info ? [] : [];
  const gallery = hotel.gallery.filter((g) => g !== hotel.image).slice(0, 6);

  // Give each room its OWN photo. The source reuses the same image set across
  // every room, so we pool all the distinct room photos and hand out a different
  // one per room — only reusing an image once every distinct photo has appeared.
  const usedRoomPhotos = new Set<string>();
  const roomPhotoPool = [
    ...new Set((rates?.rooms ?? []).flatMap((r) => r.images ?? (r.image ? [r.image] : [])).filter(Boolean)),
  ];
  const roomsForBooking = (rates?.rooms ?? []).map((r) => {
    const own = (r.images ?? (r.image ? [r.image] : [])).filter(Boolean);
    const pick =
      own.find((u) => !usedRoomPhotos.has(u)) ??
      roomPhotoPool.find((u) => !usedRoomPhotos.has(u)) ??
      own[0] ??
      r.image;
    if (pick) usedRoomPhotos.add(pick);
    return { name: r.name, nightly: r.nightly, currency: r.currency, image: pick, bookingURL: r.bookingURL };
  });

  // Shape the live hotel into the advisor's Hotel type so the docked advisor can
  // load its full knowledge base (the /api/hotel-chat route resolves this live
  // source id back via getLiveHotel + getHotelInfo and builds the dossier).
  const advisorHotel: Hotel = {
    id: hotel.sourceHotelId,
    sourceHotelId: hotel.sourceHotelId,
    name: hotel.name,
    city: hotel.city,
    destinationKey: "",
    country: hotel.country,
    neighborhood: hotel.address || hotel.city,
    shortPitch: "",
    description: info?.description ?? "",
    image: hotel.image,
    gallery: hotel.gallery,
    rating: 0,
    reviewCount: 0,
    starRating: 0,
    startingRate: 0,
    currency: "USD",
    amenities: info?.amenities ?? [],
    highlights: [],
    perks: hotel.perks.map((p, i) => ({ id: `p${i}`, label: p.replace(/\*+$/g, ""), detail: "" })),
    vibes: [],
    goodFor: [],
    distances: [],
    coordinates: hotel.coordinates ?? { lat: 0, lng: 0 },
    bookingUrl: hotel.bookingUrl,
  };

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
          <Link href="/find" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-[#f7f7f7]">
            <ArrowLeft className="size-4" /> Back to search
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-6">
        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{hotel.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#717171]">
          <MapPin className="size-4 text-[#FF385C]" />
          {[hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ")}
        </p>

        {/* Gallery — all real photos, tap any to zoom */}
        <div className="mt-4 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#eee] sm:col-span-2 sm:row-span-2 sm:aspect-auto">
            <ZoomableImage src={hotel.image} seed={hotel.sourceHotelId} alt={hotel.name} sizes="(max-width:640px) 100vw, 550px" />
          </div>
          {gallery.slice(0, 4).map((g, i) => (
            <div key={i} className="relative hidden aspect-[4/3] overflow-hidden rounded-xl bg-[#eee] sm:block">
              <ZoomableImage src={g} fallbackSrc={hotel.image} seed={`${hotel.sourceHotelId}-${i}`} alt={`${hotel.name} photo ${i + 2}`} sizes="270px" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main */}
          <div className="space-y-8">
            {/* Luxury travel advisor — knows this hotel + destination inside out */}
            <section>
              <h2 className="mb-2 text-lg font-semibold">Ask your travel advisor</h2>
              <DockedAdvisor hotel={advisorHotel} />
            </section>

            {info?.description && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">About</h2>
                <p className="text-sm leading-relaxed text-[#555]">{info.description}</p>
              </section>
            )}

            {perks.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Advisor-exclusive perks</h2>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {perks.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-[#333]">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-[#FF385C]" strokeWidth={1.5} />
                      {p.replace(/\*+$/g, "")}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {info?.amenities && info.amenities.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {info.amenities.slice(0, 24).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-[#555]">
                      <Check className="size-3 text-[#FF385C]/80" strokeWidth={2} /> {a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {info?.restaurants && info.restaurants.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Dining</h2>
                <ul className="space-y-1.5">
                  {info.restaurants.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-[#555]">
                      <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-[#FF385C]/80" strokeWidth={1.5} /> {r}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {info?.roomTypes && info.roomTypes.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Room &amp; suite types</h2>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {info.roomTypes.map((r) => (
                    <li key={r.desc} className="flex gap-2 text-sm text-[#333]">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#FF385C]" /> {r.desc}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {info?.attractions && info.attractions.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Nearby</h2>
                <div className="flex flex-wrap gap-2">
                  {info.attractions.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-[#555]">
                      <MapPin className="size-3 text-[#FF385C]/80" strokeWidth={2} /> {a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {info?.policies && info.policies.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Good to know</h2>
                <ul className="space-y-1.5">
                  {info.policies.map((p) => (
                    <li key={p} className="text-sm leading-snug text-[#717171]">{p}</li>
                  ))}
                </ul>
              </section>
            )}

            {hotel.coordinates && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Location</h2>
                <div className="h-72 overflow-hidden rounded-2xl border border-[#EBEBEB]">
                  <CityMap
                    center={[hotel.coordinates.lat, hotel.coordinates.lng]}
                    hotels={[{ id: hotel.sourceHotelId, name: hotel.name, priceLabel: rates ? formatCurrency(rates.entryNightly, rates.currency) : hotel.name, lat: hotel.coordinates.lat, lng: hotel.coordinates.lng }]}
                  />
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
              <StayDatePicker checkIn={checkIn} checkOut={checkOut} />

              <StayBooking
                sourceHotelId={hotel.sourceHotelId}
                name={hotel.name}
                city={hotel.city}
                country={hotel.country}
                image={hotel.image}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
                rooms={roomsForBooking}
              />
              {info?.tax && (
                <p className="mt-3 text-[11px] leading-snug text-[#9a9a9a]">
                  {info.tax.length > 160 ? info.tax.slice(0, 160) + "…" : info.tax}
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
