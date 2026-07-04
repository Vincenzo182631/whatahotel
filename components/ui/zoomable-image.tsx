"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";
import { ImageWithFallback } from "./image-with-fallback";
import { cn } from "@/lib/utils";

/**
 * A room/hotel image that opens a full-screen, zoomable lightbox on click.
 *
 * Image sourcing (never blank if we can help it): use the real API `src` first,
 * fall back to `fallbackSrc` (e.g. the hotel's own photo), and only then to the
 * deterministic seeded placeholder inside ImageWithFallback.
 */
export function ZoomableImage({
  src,
  fallbackSrc,
  seed,
  alt,
  sizes,
  hint = true,
}: {
  src?: string;
  fallbackSrc?: string;
  seed: string;
  alt: string;
  sizes?: string;
  /** Show the little zoom badge on hover (off for tiny thumbnails). */
  hint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const effective = (src && src.trim()) || (fallbackSrc && fallbackSrc.trim()) || "";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setZoomed(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt} larger`}
        className="group relative block h-full w-full cursor-zoom-in overflow-hidden"
      >
        <ImageWithFallback src={effective} seed={seed} alt={alt} fill sizes={sizes} className="object-cover" />
        {hint && (
          <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3.5" />
          </span>
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={close}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effective}
              alt={alt}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
              onError={(e) => {
                const el = e.currentTarget;
                if (fallbackSrc && el.src !== fallbackSrc) el.src = fallbackSrc;
              }}
              className={cn(
                "max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl transition-transform duration-300",
                zoomed ? "scale-[1.8] cursor-zoom-out" : "cursor-zoom-in",
              )}
            />
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white/90">
              {alt} · click image to {zoomed ? "shrink" : "zoom"}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
