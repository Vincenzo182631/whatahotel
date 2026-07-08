"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./image-with-fallback";

/**
 * Hotel header gallery for the comparison table: a hero photo + a thumbnail grid
 * with a "+N" badge, where tapping ANY tile (including "+N") opens a full-screen
 * lightbox that browses EVERY photo (prev/next, arrow keys, counter). Fixes the
 * old grid where the extra photos behind "+N" weren't reachable.
 */
export function HotelGallery({
  images,
  seed,
  alt,
}: {
  images: string[];
  seed: string;
  alt: string;
}) {
  const list = [...new Set(images.filter(Boolean))];
  const n = list.length;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const go = (d: number) => setI((c) => (n ? (c + d + n) % n : 0));
  const openAt = (idx: number) => {
    setI(Math.min(idx, n - 1));
    setOpen(true);
  };

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

  if (!n) return null;

  const hero = list[0];
  const thumbs = list.slice(1, 5); // up to 4 thumbnails under the hero
  const extra = Math.max(0, n - 5);

  return (
    <>
      <button
        type="button"
        onClick={() => openAt(0)}
        aria-label={`Browse ${n} photos of ${alt}`}
        className="group relative mb-1.5 block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl bg-[#eee]"
      >
        <ImageWithFallback src={hero} seed={`${seed}-0`} alt={alt} fill sizes="300px" className="object-cover" />
        {n > 1 && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-px text-[10px] font-semibold text-white backdrop-blur-sm">
            {n} photos
          </span>
        )}
      </button>

      {thumbs.length > 0 && (
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {thumbs.map((src, k) => {
            const isLast = k === thumbs.length - 1 && extra > 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => openAt(isLast ? 5 : k + 1)}
                aria-label={isLast ? `See ${extra} more photos` : `View photo ${k + 2}`}
                className="relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-[#eee]"
              >
                <ImageWithFallback src={src} seed={`${seed}-${k + 1}`} alt={`${alt} photo ${k + 2}`} fill sizes="70px" className="object-cover" />
                {isLast && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 text-[11px] font-semibold text-white">
                    +{extra}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
