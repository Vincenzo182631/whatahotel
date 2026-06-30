"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { fallbackImage } from "@/lib/services/images";

interface Props extends Omit<ImageProps, "src"> {
  src: string;
  seed: string;
}

/**
 * next/image with a deterministic fallback. Demo inventory points at Unsplash;
 * if any image 404s we swap to a stable seeded image so cards never break.
 */
export function ImageWithFallback({ src, seed, alt, ...props }: Props) {
  const [current, setCurrent] = useState(src);
  return (
    <Image
      {...props}
      src={current}
      alt={alt}
      onError={() => setCurrent(fallbackImage(seed))}
      unoptimized={current.includes("picsum.photos")}
    />
  );
}
