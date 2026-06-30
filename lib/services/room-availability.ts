import { hotelDetailsService } from "./hotel-details";
import type { RoomAvailability, RoomOption } from "./types";

/**
 * Room Availability service. Generates a deterministic set of room options per
 * hotel from its starting rate. Replace with Amadeus hotel-offers availability.
 */
export interface RoomAvailabilityService {
  getAvailability(hotelId: string): Promise<RoomAvailability>;
}

function roomsFor(hotelId: string, base: number, view?: string): RoomOption[] {
  return [
    {
      id: `${hotelId}-deluxe`,
      name: "Deluxe Room",
      description: "Generous room with sitting area and marble bath.",
      pricePerNight: base,
      bedType: "King or Twin",
      view: "City or courtyard",
      refundable: true,
      maxOccupancy: 2,
    },
    {
      id: `${hotelId}-junior-suite`,
      name: "Junior Suite",
      description: "Separate lounge space, premium amenities and turndown.",
      pricePerNight: Math.round(base * 1.5),
      bedType: "King",
      view: view ?? "Premium",
      refundable: true,
      maxOccupancy: 3,
    },
    {
      id: `${hotelId}-signature-suite`,
      name: "Signature Suite",
      description: "The property's flagship suite with the best views and butler service.",
      pricePerNight: Math.round(base * 2.4),
      bedType: "King + sofa bed",
      view: view ?? "Landmark",
      refundable: false,
      maxOccupancy: 4,
    },
  ];
}

export const roomAvailabilityService: RoomAvailabilityService = {
  async getAvailability(hotelId) {
    const hotel = await hotelDetailsService.getHotelById(hotelId);
    if (!hotel) return { hotelId, available: false, rooms: [] };
    const bestView = hotel.amenities.includes("oceanview")
      ? "Ocean"
      : hotel.distances[0]?.label;
    return {
      hotelId,
      available: true,
      rooms: roomsFor(hotelId, hotel.startingRate, bestView),
    };
  },
};
