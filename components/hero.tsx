"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { HeroSearch } from "@/components/sections/hero-search";
import { CategoryPills } from "@/components/sections/category-pills";

export function Hero() {
  return (
    <section className="relative -mt-[4.5rem] flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-[6.5rem] text-center">
      {/* Cinematic background */}
      <div className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* legibility + fade into the page */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1526]/70 via-[#0a1526]/55 to-[#faf6f0]" />
        <div className="absolute inset-0 bg-[#0a1526]/25" />
      </div>

      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/90 backdrop-blur"
      >
        Search · Rank · Compare luxury hotels
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="balance font-display text-5xl font-semibold leading-[1.02] tracking-tight text-cream drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-6xl md:text-7xl"
      >
        The best hotels in any city,
        <br />
        <span
          className="italic font-medium"
          style={{
            backgroundImage: "linear-gradient(135deg, #F0BFC2 0%, #D98A8E 60%, #C1666B 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          ranked for you.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="balance mt-5 max-w-xl text-lg leading-relaxed text-white/85 drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]"
      >
        Tell me a city and what matters most — I&apos;ll search its finest hotels,
        rank them out of 10 for your needs, and help you compare the top picks.
        Just by chatting.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="mt-9 w-full max-w-2xl"
      >
        <HeroSearch />
        <CategoryPills />
      </motion.div>

      {/* Trust line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 inline-flex items-center gap-2 text-sm text-white/75"
      >
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="size-4"
              strokeWidth={1.5}
              style={{ fill: "#E0989C", color: "#E0989C" }}
            />
          ))}
        </span>
        Trusted by discerning travellers worldwide
      </motion.div>
    </section>
  );
}
