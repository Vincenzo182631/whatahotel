import type { Hotel } from "./types";

/**
 * Images service. Returns an ordered gallery for a hotel. Swap for the
 * Unsplash API or the WhataHotel media CDN; the UI uses a seeded fallback if a
 * remote image fails to load.
 */
export interface ImagesService {
  getGallery(hotel: Hotel): string[];
}

export const imagesService: ImagesService = {
  getGallery(hotel) {
    return [hotel.image, ...hotel.gallery].filter(Boolean);
  },
};

/** Deterministic always-available fallback used by <ImageWithFallback>. */
export function fallbackImage(seed: string, w = 1200, h = 800) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

/**
 * Upgrade known thumbnail URLs to the largest variant the CDN offers, so hotel
 * and room photos render crisp on retina screens and in the lightbox. Images are
 * served un-optimized (native URL), so quality depends on the source size — this
 * requests the biggest available. Unknown hosts are returned unchanged.
 *
 * - Booking.com CDN (cf.bstatic.com): the path carries the size, e.g.
 *   `/max1024x768/…` → `/max1920x1080/` (≈1620px wide vs 1024). Also handles the
 *   width-only `/max500/` and `/square…/` variants.
 */
export function hiResImage(url: string | undefined | null): string {
  if (!url) return url ?? "";
  if (/(?:^|\.)bstatic\.com\//.test(url) || /booking\.com\//.test(url)) {
    return url
      .replace(/\/max\d+x\d+\//, "/max1920x1080/")
      .replace(/\/max\d+\//, "/max1920/")
      .replace(/\/square\d+\//, "/max1920x1080/");
  }
  return url;
}
