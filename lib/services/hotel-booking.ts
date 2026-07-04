import { getLiveRates } from "./live-rates";
import type { Hotel } from "./types";

/**
 * Booking manifest — the real, prefilled WhataHotel booking-form links for a
 * hotel's available rooms on the guest's chosen dates. Each entry has a stable
 * id (a slug of the room name) so the advisor can reference a room as `[book:id]`
 * and the chat client resolves it to the actual URL — the model never handles
 * (or can invent) the URL itself.
 *
 * Empty unless the hotel has a source id AND real dates are given, so we never
 * surface a booking link for the wrong dates.
 */

export interface BookingLink {
  id: string;
  room: string;
  url: string;
  image?: string;
  /** A short, human blurb for the room card. */
  description?: string;
  nightly?: number;
  currency?: string;
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "room"
  );
}

export async function buildBookingManifest(
  hotel: Hotel,
  checkIn: string,
  checkOut: string,
): Promise<BookingLink[]> {
  if (!hotel.sourceHotelId || !checkIn || !checkOut) return [];
  const rates = await getLiveRates({
    sourceHotelId: hotel.sourceHotelId,
    checkIn,
    checkOut,
  }).catch(() => null);
  if (!rates) return [];

  const out: BookingLink[] = [];
  const seen = new Set<string>();
  for (const r of rates.rooms) {
    if (!r.bookingURL) continue;
    let id = slug(r.name);
    while (seen.has(id)) id += "-2";
    seen.add(id);
    const description = r.description
      ? r.description.length > 150
        ? r.description.slice(0, 150).trim() + "…"
        : r.description
      : undefined;
    out.push({
      id,
      room: r.name,
      url: r.bookingURL,
      image: r.image,
      description,
      nightly: r.nightly || undefined,
      currency: r.currency,
    });
  }
  return out;
}
