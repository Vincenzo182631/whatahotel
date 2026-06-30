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
