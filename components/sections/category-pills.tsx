"use client";

import { motion } from "framer-motion";
import { Scale, Award, Trophy, Gift, type LucideIcon } from "lucide-react";
import { useConversation } from "@/store/conversation-store";

const CATEGORIES: {
  icon: LucideIcon;
  label: string;
  description: string;
  prompt: string;
}[] = [
  {
    icon: Scale,
    label: "Compare Hotels",
    description: "Put the finest hotels head-to-head with live rates and key features.",
    prompt:
      "I'd like to compare the best luxury hotels side by side. Which city should we look at?",
  },
  {
    icon: Award,
    label: "Best Hotels in the City",
    description: "A ranked shortlist of the finest hotels, tailored to you.",
    prompt:
      "Show me the best luxury hotels in a city — I'll tell you which one I have in mind.",
  },
  {
    icon: Trophy,
    label: "Top 10 Hotels in the City",
    description: "The definitive ranking, scored out of 10 for your needs.",
    prompt:
      "Give me a ranked top 10 of the best hotels in a city, best-fit first.",
  },
  {
    icon: Gift,
    label: "Hotels with the Best Perks",
    description: "Stays with the most valuable advisor-exclusive extras.",
    prompt:
      "Find me hotels with the best advisor perks and inclusions — upgrades, breakfast, and credits.",
  },
];

export function CategoryPills() {
  const send = useConversation((s) => s.send);

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2.5">
      {CATEGORIES.map((c, i) => (
        <motion.button
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.05 }}
          onClick={() => send(c.prompt)}
          title={c.description}
          aria-label={`${c.label} — ${c.description}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-foreground/80 shadow-[0_10px_30px_-14px_rgba(16,33,58,0.5)] ring-1 ring-black/[0.04] backdrop-blur transition-all hover:-translate-y-0.5 hover:text-primary"
        >
          <c.icon className="size-4 text-primary" strokeWidth={1.5} />
          {c.label}
        </motion.button>
      ))}
    </div>
  );
}
