import { BookingLoader } from "@/components/ui/booking-loader";

/**
 * Root Suspense fallback — shown while a destination route renders its server
 * work (live rates, rooms, city data) on navigation. Branded booking loader.
 */
export default function Loading() {
  return <BookingLoader message="Finding your stay…" />;
}
