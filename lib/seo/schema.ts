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

interface BlogArticle {
  slug: string;
  title: string;
  excerpt?: string;
  image?: string;
  date: string;
  author?: string;
}

/** A breadcrumb trail. Items are ordered root → current; the current page is
 *  last. Each item links to its path (the last may be the page itself). */
export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** The journal index as a Blog, listing each post. */
export function blogSchema(articles: BlogArticle[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The Journal — WhataHotel",
    description:
      "Destination guides, packing wisdom and luxury travel inspiration from the WhataHotel advisory team.",
    url: `${SITE_URL}/journal`,
    publisher: { "@type": "Organization", name: SITE_NAME },
    blogPost: articles.map((a) =>
      clean({
        "@type": "BlogPosting",
        headline: a.title,
        description: a.excerpt,
        url: `${SITE_URL}/journal/${a.slug}`,
        image: a.image ? abs(a.image) : undefined,
        datePublished: a.date,
        author: a.author ? { "@type": "Organization", name: a.author } : undefined,
      }),
    ),
  };
}

interface CityHotel {
  id: string;
  name: string;
  image?: string;
  startingRate?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  starRating?: number;
}

/** A city page as a CollectionPage whose mainEntity is an ordered ItemList of
 *  the city's hotels — each a compact Hotel node. */
export function cityHotelsSchema(input: {
  id: string;
  label: string;
  country?: string;
  hotels: CityHotel[];
}): Json {
  const items = input.hotels.map((h, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: clean({
      "@type": "Hotel",
      name: h.name,
      url: `${SITE_URL}/hotel/${h.id}`,
      image: h.image ? abs(h.image) : undefined,
      address: clean({
        "@type": "PostalAddress",
        addressLocality: input.label.split(",")[0].trim(),
        addressCountry: input.country,
      }),
      starRating:
        h.starRating && h.starRating > 0
          ? { "@type": "Rating", ratingValue: h.starRating, bestRating: 5 }
          : undefined,
      aggregateRating:
        h.rating && h.rating > 0 && h.reviewCount && h.reviewCount > 0
          ? { "@type": "AggregateRating", ratingValue: h.rating, bestRating: 10, reviewCount: h.reviewCount }
          : undefined,
      priceRange:
        h.startingRate && h.startingRate > 0
          ? `from ${h.currency || "USD"} ${Math.round(h.startingRate)} / night`
          : undefined,
    }),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Hotels in ${input.label}`,
    description: `Browse every luxury hotel in ${input.label}, with advisor-exclusive perks.`,
    url: `${SITE_URL}/city/${input.id}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items,
    },
  };
}

