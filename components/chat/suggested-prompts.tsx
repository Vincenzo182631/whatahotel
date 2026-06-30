"use client";

import { motion } from "framer-motion";

export const SUGGESTION_CHIPS: { emoji: string; label: string; prompt: string }[] =
  [
    { emoji: "✨", label: "Romantic weekend", prompt: "Plan a romantic weekend for two — somewhere intimate and beautiful." },
    { emoji: "🏖", label: "Beach escape", prompt: "I want a beachfront escape with an incredible pool and ocean views." },
    { emoji: "🏙", label: "Luxury city stay", prompt: "A luxury city stay with great dining and a spa." },
    { emoji: "👨‍👩‍👧", label: "Family vacation", prompt: "A family vacation that's fun for the kids but still feels luxurious." },
    { emoji: "💼", label: "Business travel", prompt: "I need a refined hotel for business travel with a gym and fast wifi." },
    { emoji: "🚢", label: "Pre-cruise hotel", prompt: "A pre-cruise hotel near the port for one night before we sail." },
    { emoji: "🏔", label: "Mountain retreat", prompt: "A cozy mountain retreat with a spa and a fireplace." },
    { emoji: "🎰", label: "Vegas getaway", prompt: "A Las Vegas getaway with a great pool scene and shows." },
  ];

export const EXAMPLE_PROMPTS = [
  "I want a beachfront resort in Bali under $700 per night.",
  "My wife and I are celebrating our anniversary in Paris.",
  "Find the best luxury hotel in Tokyo with an amazing spa.",
  "I'm visiting Paris in October with two children.",
  "I need a hotel near the Eiffel Tower with breakfast included.",
];

export function SuggestionChips({
  onPick,
  className,
}: {
  onPick: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap justify-center gap-2.5">
        {SUGGESTION_CHIPS.map((chip, i) => (
          <motion.button
            key={chip.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            onClick={() => onPick(chip.prompt)}
            className="group inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-foreground/80 transition-all hover:border-primary/40 hover:text-primary"
          >
            <span className="text-base">{chip.emoji}</span>
            {chip.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function ExamplePrompts({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
      {EXAMPLE_PROMPTS.map((prompt, i) => (
        <motion.button
          key={prompt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 + i * 0.06 }}
          onClick={() => onPick(prompt)}
          className="group flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-black/[0.025] px-4 py-2.5 text-left text-[13px] text-foreground/60 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground/90"
        >
          <span className="text-primary/60 transition-transform group-hover:translate-x-0.5">
            →
          </span>
          <span className="italic">&ldquo;{prompt}&rdquo;</span>
        </motion.button>
      ))}
    </div>
  );
}
