import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { hotelDetailsService } from "@/lib/services";
import { DESTINATIONS } from "@/lib/services/mock-data";
import { HotelGridCard } from "@/components/airbnb-landing";
import { TravelDatesBar } from "@/components/search/travel-dates-bar";
import { CityMap, type MapHotel } from "@/components/hotel/city-map";

type Params = { params: Promise<{ id: string }> };

// Rough city centres, used when no hotel in the city has coordinates yet.
const CITY_CENTER: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  tokyo: [35.6762, 139.6503],
  bali: [-8.4095, 115.1889],
  maldives: [3.2028, 73.2207],
  newyork: [40.7128, -74.006],
  london: [51.5074, -0.1278],
  dubai: [25.2048, 55.2708],
  maui: [20.7984, -156.3319],
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const meta = DESTINATIONS[id];
  if (!meta) return { title: "City not found — WhataHotel" };
  return {
    title: `Hotels in ${meta.label} — WhataHotel`,
    description: `Browse every luxury hotel in ${meta.label} on the map, with advisor-exclusive perks.`,
  };
}

export default async function CityPage({ params }: Params) {
  const { id } = await params;
  const meta = DESTINATIONS[id];
  if (!meta) notFound();

  const all = await hotelDetailsService.getAllHotels();
  const hotels = all
    .filter((h) => h.destinationKey === id)
    .sort((a, b) => a.startingRate - b.startingRate); // price low → high
  if (hotels.length === 0) notFound();

  const mapHotels: MapHotel[] = hotels
    .filter((h) => h.coordinates?.lat && h.coordinates?.lng)
    .map((h) => ({
      id: h.id,
      name: h.name,
      priceLabel: h.name,
      lat: h.coordinates.lat,
      lng: h.coordinates.lng,
    }));

  const center: [number, number] = mapHotels.length
    ? [
        mapHotels.reduce((s, h) => s + h.lat, 0) / mapHotels.length,
        mapHotels.reduce((s, h) => s + h.lng, 0) / mapHotels.length,
      ]
    : CITY_CENTER[id] ?? [0, 0];

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto max-w-none" />
          </Link>
          <BackButton fallback="/" />
        </div>
      </header>

      {/* Split: map left, hotel list right */}
      <div className="lg:grid lg:h-[calc(100dvh-4.25rem)] lg:grid-cols-2">
        {/* Map */}
        <div className="h-[45vh] w-full lg:h-full">
          <CityMap hotels={mapHotels} center={center} />
        </div>

        {/* Hotel list */}
        <div className="lg:h-full lg:overflow-y-auto">
          <div className="px-6 py-6">
            <div className="mb-1 flex items-center gap-1.5 text-sm text-[#717171]">
              <MapPin className="size-4 text-[#FF385C]" strokeWidth={2} />
              {meta.country}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {hotels.length} hotels in {meta.label.split(",")[0]}
            </h1>
            <p className="mt-1 text-sm text-[#717171]">
              Every stay comes with advisor-exclusive complimentary perks.
              {mapHotels.length > 0 &&
                ` ${mapHotels.length} shown on the map.`}
            </p>

            <TravelDatesBar className="mt-4" />

            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3">
              {hotels.map((hotel) => (
                <HotelGridCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
