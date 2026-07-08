"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./image-with-fallback";

/**
 * A room thumbnail that opens a full-screen lightbox to browse ALL of that
 * room's real photos (prev/next, keyboard, counter). Used in the comparison so
 * every WhataHotel room image is viewable, not just the first.
 */
export function RoomGallery({
  images,
  fallbackSrc,
  seed,
  alt,
}: {
  images: string[];
  fallbackSrc?: string;
  seed: string;
  alt: string;
}) {
  const list = [...new Set(images.filter(Boolean))];
  if (!list.length && fallbackSrc) list.push(fallbackSrc);
  const n = list.length;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const go = (d: number) => setI((c) => (n ? (c + d + n) % n : 0));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, n]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setI(0);
          setOpen(true);
        }}
        aria-label={`View photos of ${alt}`}
        className="group relative block h-full w-full cursor-zoom-in overflow-hidden"
      >
        <ImageWithFallback src={list[0] || ""} seed={seed} alt={alt} fill sizes="96px" className="object-cover" />
        {n > 1 && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/55 px-1 py-px text-[9px] font-semibold text-white backdrop-blur-sm">
            {n} photos
          </span>
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(-1); }}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(1); }}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={list[i]}
              alt={`${alt} — photo ${i + 1}`}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const el = e.currentTarget;
                if (fallbackSrc && el.src !== fallbackSrc) el.src = fallbackSrc;
              }}
              className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            />
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white/90">
              {alt}
              {n > 1 ? ` · ${i + 1} / ${n}` : ""}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
