import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin } from "lucide-react";
import { hotelsInCountry } from "@/lib/services/country-pages";
import { HotelGridCard } from "@/components/airbnb-landing";
import { TravelDatesBar } from "@/components/search/travel-dates-bar";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const hotels = hotelsInCountry(slug);
  if (!hotels.length) return { title: "Country not found — WhataHotel" };
  return {
    title: `Hotels in ${hotels[0].country} — WhataHotel`,
    description: `Browse every luxury hotel in ${hotels[0].country}, each with advisor-exclusive perks.`,
  };
}

export default async function CountryPage({ params }: Params) {
  const { slug } = await params;
  const hotels = hotelsInCountry(slug);
  if (!hotels.length) notFound();

  const country = hotels[0].country;
  // Group by city so a big country reads as sections.
  const byCity = new Map<string, typeof hotels>();
  for (const h of hotels) {
    const city = h.city || "Other";
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(h);
  }
  const cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto max-w-none" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7]"
          >
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-1 flex items-center gap-1.5 text-sm text-[#717171]">
          <MapPin className="size-4 text-[#FF385C]" strokeWidth={2} /> {country}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {hotels.length} luxury hotels in {country}
        </h1>
        <p className="mt-1 text-sm text-[#717171]">
          Every stay includes advisor-exclusive complimentary perks. Add your dates for live rates.
        </p>

        <TravelDatesBar className="mt-4" />

        <div className="mt-8 space-y-10">
          {cities.map(([city, list]) => (
            <section key={city}>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold text-[#1a1a1a]">
                  {city} <span className="text-sm font-normal text-[#9a9a9a]">· {list.length}</span>
                </h2>
                {list[0].destinationKey && (
                  <Link
                    href={`/city/${list[0].destinationKey}`}
                    className="shrink-0 text-sm font-medium text-[#FF385C] hover:underline"
                  >
                    View {city} on the map →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {list.map((hotel) => (
                  <HotelGridCard key={hotel.id} hotel={hotel} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
