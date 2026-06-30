"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useConversation } from "@/store/conversation-store";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const DESTINATIONS: { label: string; country: string; image: string; prompt: string }[] = [
  { label: "Paris", country: "France", image: img("1502602898657-3e91760cbb34"), prompt: "Find me a luxury hotel in Paris." },
  { label: "Tokyo", country: "Japan", image: img("1540959733332-eab4deabeeaf"), prompt: "Find me a luxury hotel in Tokyo with an amazing spa." },
  { label: "Bali", country: "Indonesia", image: img("1537953773345-d172ccf13cf1"), prompt: "Find me a luxury resort in Bali." },
  { label: "The Maldives", country: "Maldives", image: img("1514282401047-d79a71a590e8"), prompt: "Find me an overwater villa in the Maldives." },
  { label: "New York", country: "USA", image: img("1496442226666-8d4d0e62e6e9"), prompt: "Find me a luxury hotel in New York City." },
  { label: "London", country: "UK", image: img("1513635269975-59663e0ac1ad"), prompt: "Find me a luxury hotel in London." },
  { label: "Dubai", country: "UAE", image: img("1512453979798-5ea266f8880c"), prompt: "Find me a beach luxury hotel in Dubai." },
  { label: "Maui", country: "Hawaii", image: img("1507525428034-b723cf961d3e"), prompt: "Find me a beachfront luxury resort in Maui." },
];

export function PopularDestinations() {
  const send = useConversation((s) => s.send);

  return (
    <section className="container py-20">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
          Where dreams begin
        </p>
        <h2 className="mt-3 font-display text-3xl font-light sm:text-4xl">
          Popular <span className="text-gradient-gold italic">destinations</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-foreground/70">
          Tap a destination and your advisor will start curating instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {DESTINATIONS.map((d, i) => (
          <motion.button
            key={d.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
            onClick={() => send(d.prompt)}
            className="group relative h-56 overflow-hidden rounded-3xl text-left"
          >
            <ImageWithFallback
              src={d.image}
              seed={`dest-${d.label}`}
              alt={d.label}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
              <div>
                <h3 className="font-display text-xl font-medium text-cream">
                  {d.label}
                </h3>
                <p className="text-xs text-cream/70">{d.country}</p>
              </div>
              <span className="grid size-9 translate-y-2 place-items-center rounded-full glass opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <ArrowUpRight className="size-4 text-primary" strokeWidth={1.5} />
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
