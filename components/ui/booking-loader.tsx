import { BedDouble } from "lucide-react";

/**
 * Branded, hotel-booking-themed loading visual. Pure CSS animation (no client
 * JS) so it can be used as a Suspense fallback in a route `loading.tsx`.
 * A gradient ring sweeps around a pulsing bed icon under the WhataHotel mark.
 */
export function BookingLoader({
  message = "Preparing your stay…",
  fullscreen = true,
}: {
  message?: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      className={
        fullscreen
          ? "grid min-h-dvh place-items-center bg-white px-6"
          : "grid place-items-center px-6 py-16"
      }
    >
      <div className="flex flex-col items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="What a Hotel" className="h-7 w-auto opacity-90" />

        <div className="relative grid size-20 place-items-center">
          {/* Sweeping gradient ring */}
          <span
            className="absolute inset-0 animate-spin rounded-full"
            style={{
              animationDuration: "0.9s",
              background: "conic-gradient(from 90deg, rgba(255,56,92,0) 0%, #FF385C 100%)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
            }}
            aria-hidden
          />
          {/* Soft halo */}
          <span className="absolute inset-2 animate-ping rounded-full bg-[#FF385C]/10" aria-hidden />
          <BedDouble className="size-7 animate-pulse text-[#FF385C]" strokeWidth={1.75} />
        </div>

        <p className="text-sm font-medium text-[#717171]" role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </div>
  );
}
