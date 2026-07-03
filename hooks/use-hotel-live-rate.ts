"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Per-hotel live rate for the chosen dates — the same method=rates call the stay
 * page uses, so the card rate matches the room rate exactly. Fetches are limited
 * to a few at a time (the source throttles) and only run when the card is in
 * view, so a page of cards fills progressively instead of firing all at once.
 */

const MAX_CONCURRENT = 4;
let active = 0;
const waiting: (() => void)[] = [];

function limited<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          waiting.shift()?.();
        });
    };
    if (active < MAX_CONCURRENT) run();
    else waiting.push(run);
  });
}

/** Ref + flag that flips true once the element nears the viewport (then stays true). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return { ref, inView };
}

export interface HotelLiveRate {
  nightly: number; // cheapest room, per night (matches the stay page)
  total: number;
  currency: string;
}

export function useHotelLiveRate(
  slug: string,
  checkIn: string,
  checkOut: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["hotel-rate", slug, checkIn, checkOut],
    queryFn: async (): Promise<HotelLiveRate | null> => {
      const data = await limited(() =>
        fetch(
          `/api/rates?id=${encodeURIComponent(slug)}&checkIn=${checkIn}&checkOut=${checkOut}`,
        ).then((r) => (r.ok ? r.json() : null)),
      );
      if (!data || !data.live || !data.entryNightly) return null;
      return { nightly: data.entryNightly, total: data.total, currency: data.currency };
    },
    enabled: Boolean(enabled && slug && checkIn && checkOut),
    staleTime: 30 * 60 * 1000,
  });
}
