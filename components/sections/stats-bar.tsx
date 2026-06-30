"use client";

import { motion } from "framer-motion";

const STATS: { value: string; label: string }[] = [
  { value: "9", label: "Iconic destinations" },
  { value: "100%", label: "Advisor-vetted hotels" },
  { value: "AI", label: "Powered matching" },
];

export function StatsBar() {
  return (
    <section className="container py-12">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl glass-strong sm:grid-cols-3">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center"
          >
            <span className="font-display text-4xl text-gradient-gold sm:text-5xl">
              {s.value}
            </span>
            <span className="text-sm uppercase tracking-wider text-foreground/55">
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
