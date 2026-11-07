import type { Hotel } from "@/lib/services/types";

/**
 * SEO structured data (schema.org JSON-LD) builders.
 *
 * Every builder returns a plain object to be rendered inside a
 * <script type="application/ld+json"> via the <JsonLd> component. Builders only
 * ever emit fields we actually have — missing values are omitted, never invented.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://whatahotel.vercel.app"
).replace(/\/$/, "");
export const SITE_NAME = "WhataHotel";

type Json = Record<string, unknown>;

/** Drop undefined/null/empty values so the emitted JSON-LD stays clean. */
function clean<T extends Json>(obj: T): T {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as T;
}

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

/** Site-wide publisher identity. Rendered once in the root layout. */
export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description:
      "An AI-first luxury travel advisor that searches, ranks and compares the finest hotels — with advisor-exclusive perks.",
  };
}

/** The website itself (helps search engines label the brand site). */
export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}

interface LodgingInput {
  path: string; // e.g. /stay/2171
  name: string;
  description?: string;
  images?: string[];
  streetAddress?: string;
  city?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  amenities?: string[];
  priceFrom?: { amount: number; currency: string };
  brand?: string;
}

/** A hotel / lodging business (the primary rich-result for a hotel page). */
export function lodgingSchema(h: LodgingInput): Json {
  const images = [...new Set((h.images ?? []).filter(Boolean))].slice(0, 8).map(abs);
  const geo = h.coordinates?.lat && h.coordinates?.lng
    ? { "@type": "GeoCoordinates", latitude: h.coordinates.lat, longitude: h.coordinates.lng }
    : undefined;
  const address = clean({
    "@type": "PostalAddress",
    streetAddress: h.streetAddress,
    addressLocality: h.city,
    addressCountry: h.country,
  });
  const amenityFeature = (h.amenities ?? [])
    .map((a) => a.trim())
    .filter((a) => a.length > 1 && a.length < 60)
    .slice(0, 20)
    .map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true }));

  return clean({
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: h.name,
    description: h.description?.trim(),
    url: abs(h.path),
    image: images,
    brand: h.brand ? { "@type": "Brand", name: h.brand } : undefined,
    address: Object.keys(address).length > 1 ? address : undefined,
    geo,
    amenityFeature,
    priceRange: h.priceFrom
      ? `from ${h.priceFrom.currency} ${Math.round(h.priceFrom.amount)} / night`
      : undefined,
  });
}

/** A curated-catalogue hotel — carries star rating + guest rating we can expose. */
export function catalogueHotelSchema(hotel: Hotel): Json {
  const base = lodgingSchema({
    path: `/hotel/${hotel.id}`,
    name: hotel.name,
    description: hotel.description || hotel.shortPitch,
    images: [hotel.image, ...(hotel.gallery ?? [])],
    city: hotel.city,
    country: hotel.country,
    coordinates: hotel.coordinates,
    amenities: hotel.amenities,
    brand: hotel.brand,
    priceFrom: hotel.startingRate > 0 ? { amount: hotel.startingRate, currency: hotel.currency || "USD" } : undefined,
  });
  return clean({
    ...base,
    starRating:
      hotel.starRating > 0
        ? { "@type": "Rating", ratingValue: hotel.starRating, bestRating: 5 }
        : undefined,
    aggregateRating:
      hotel.rating > 0 && hotel.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: hotel.rating,
            bestRating: 10,
            reviewCount: hotel.reviewCount,
          }
        : undefined,
  });
}
