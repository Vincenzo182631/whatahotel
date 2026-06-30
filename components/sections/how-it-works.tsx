"use client";

import { motion } from "framer-motion";
import { MessagesSquare, Sparkles, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Describe your trip",
    body: "Tell your advisor how you want to feel — the destination, the occasion, the budget. In plain words, no forms.",
  },
  {
    icon: Sparkles,
    title: "Get curated picks",
    body: "Receive a short list of hand-vetted luxury hotels, each with a clear reason it was chosen for you.",
  },
  {
    icon: BadgeCheck,
    title: "Book with perks",
    body: "Reserve through your advisor and enjoy exclusive benefits — upgrades, credits and breakfast included.",
  },
];

export function HowItWorks() {
  const toTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <section className="container py-20">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
          How it works
        </p>
        <h2 className="mt-3 font-display text-3xl font-light sm:text-4xl">
          Three steps to your{" "}
          <span className="text-gradient-gold italic">perfect stay</span>
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative rounded-3xl glass-strong p-7"
          >
            <span className="absolute right-6 top-6 font-display text-5xl text-primary/15">
              {i + 1}
            </span>
            <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <s.icon className="size-5" />
            </span>
            <h3 className="font-display text-xl font-medium">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button size="lg" onClick={toTop}>
          Start the conversation
        </Button>
      </div>
    </section>
  );
}
