import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin, Sparkles, BedDouble, UtensilsCrossed, Check, CalendarDays } from "lucide-react";
import { getLiveHotel, getLiveRates, getHotelInfo } from "@/lib/services/live-rates";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { CityMap } from "@/components/hotel/city-map";
import { StayDatePicker } from "@/components/search/stay-date-picker";
import { StayBooking } from "@/components/search/stay-booking";
import { formatCurrency } from "@/lib/utils";

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

        {/* Gallery */}
        <div className="mt-4 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#eee] sm:col-span-2 sm:row-span-2 sm:aspect-auto">
            <ImageWithFallback src={hotel.image} seed={hotel.sourceHotelId} alt={hotel.name} fill sizes="(max-width:640px) 100vw, 550px" className="object-cover" />
          </div>
          {gallery.slice(0, 4).map((g, i) => (
            <div key={i} className="relative hidden aspect-[4/3] overflow-hidden rounded-xl bg-[#eee] sm:block">
              <ImageWithFallback src={g} seed={hotel.sourceHotelId + i} alt="" fill sizes="270px" className="object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main */}
          <div className="space-y-8">
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

              <div className="mt-5">
                {rates && rates.rooms.length > 0 ? (
                  <>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#717171]">
                      Rooms — {nights} night{nights > 1 ? "s" : ""}
                    </p>
                    <ul className="space-y-2">
                      {rates.rooms.slice(0, 6).map((r) => (
                        <li key={r.name} className="flex items-center gap-3 rounded-xl bg-[#f7f7f7] p-2 text-sm">
                          {r.image ? (
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#eee]">
                              <ImageWithFallback src={r.image} seed={r.name} alt={r.name} fill sizes="56px" className="object-cover" />
                            </div>
                          ) : (
                            <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#eee] text-[#FF385C]/70">
                              <BedDouble className="size-5" strokeWidth={1.5} />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate">{r.name}</span>
                          <span className="shrink-0 font-semibold">{formatCurrency(r.nightly, r.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : nights > 0 ? (
                  <p className="text-sm text-[#717171]">No availability for those dates — try different dates.</p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-[#717171]">
                    <CalendarDays className="size-4 text-[#FF385C]" /> Pick dates to see live room rates.
                  </p>
                )}
              </div>

              <StayBooking
                sourceHotelId={hotel.sourceHotelId}
                name={hotel.name}
                city={hotel.city}
                country={hotel.country}
                image={hotel.image}
                checkIn={checkIn}
                checkOut={checkOut}
                rooms={(rates?.rooms ?? []).map((r) => ({
                  name: r.name,
                  nightly: r.nightly,
                  currency: r.currency,
                }))}
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
