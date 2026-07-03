"use client";

import { motion } from "framer-motion";

export const SUGGESTION_CHIPS: { emoji: string; label: string; prompt: string }[] =
  [
    { emoji: "⚖️", label: "Compare Paris", prompt: "Compare the best luxury hotels in Paris side by side." },
    { emoji: "🌴", label: "Compare Bali", prompt: "Compare the top hotels in Bali on perks, rooms and location." },
    { emoji: "🎰", label: "Vegas showdown", prompt: "Compare the best hotels on the Las Vegas Strip." },
    { emoji: "🏙", label: "Tokyo pick", prompt: "Compare the finest hotels in Tokyo and tell me which to pick." },
    { emoji: "🎁", label: "Best perks", prompt: "Compare hotels by their advisor perks and inclusions." },
    { emoji: "🏝", label: "Maldives duel", prompt: "Compare the top overwater resorts in the Maldives." },
    { emoji: "🌆", label: "New York", prompt: "Compare the best luxury hotels in New York City." },
    { emoji: "💷", label: "London", prompt: "Compare the best hotels in London on location and dining." },
  ];

export const EXAMPLE_PROMPTS = [
  "Compare the best luxury hotels in Paris for my dates.",
  "Bellagio vs Aria vs Wynn in Las Vegas — which should I pick?",
  "Compare the top hotels in Bali on perks and location.",
  "Compare the finest spa hotels in Tokyo side by side.",
  "Compare three Maldives resorts and tell me the trade-offs.",
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
          className="group flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-black/[0.025] px-4 py-2.5 text-left text-[13px] text-foreground/72 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground/90"
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
