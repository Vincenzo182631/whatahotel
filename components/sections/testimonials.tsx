"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const REVIEWS: {
  quote: string;
  name: string;
  location: string;
  label: string;
  initials: string;
}[] = [
  {
    quote:
      "It felt like texting a friend who happens to know every great hotel on earth. Booked our anniversary suite in Paris in ten minutes.",
    name: "Eleanor V.",
    location: "London, UK",
    label: "Anniversary",
    initials: "EV",
  },
  {
    quote:
      "I described the honeymoon I'd dreamed of and it found the exact overwater villa — plus perks I'd never have gotten myself.",
    name: "Marcus & Aimee",
    location: "Singapore",
    label: "Honeymoon",
    initials: "MA",
  },
  {
    quote:
      "Travelling with two kids is hard. It asked the right questions and found a resort that was luxurious AND brilliant for them.",
    name: "Priya N.",
    location: "Dubai, UAE",
    label: "Family escape",
    initials: "PN",
  },
];

export function Testimonials() {
  return (
    <section className="container py-20">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
          Word of mouth
        </p>
        <h2 className="mt-3 font-display text-3xl font-light sm:text-4xl">
          Loved by{" "}
          <span className="text-gradient-gold italic">discerning travellers</span>
        </h2>
        <p className="mt-3 flex items-center justify-center gap-2 text-foreground/70">
          <span className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-primary text-primary" />
            ))}
          </span>
          Based on thousands of curated stays
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {REVIEWS.map((r, i) => (
          <motion.figure
            key={r.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex flex-col gap-4 rounded-3xl glass-strong p-6"
          >
            <span className="inline-flex w-fit rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs text-primary">
              {r.label}
            </span>
            <blockquote className="text-[15px] leading-relaxed text-foreground/85">
              &ldquo;{r.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3 pt-2">
              <span className="grid size-10 place-items-center rounded-full bg-gold-sheen font-display text-sm font-semibold text-white">
                {r.initials}
              </span>
              <span>
                <span className="block text-sm font-medium">{r.name}</span>
                <span className="block text-xs text-foreground/65">
                  {r.location}
                </span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
