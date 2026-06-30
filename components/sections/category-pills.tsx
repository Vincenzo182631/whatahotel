"use client";

import { motion } from "framer-motion";
import { useConversation } from "@/store/conversation-store";

const CATEGORIES: { label: string; prompt: string }[] = [
  { label: "Boutique stays", prompt: "Show me intimate boutique luxury stays with real character." },
  { label: "Beach resorts", prompt: "Find me a beachfront luxury resort with an incredible pool." },
  { label: "Family escapes", prompt: "A family escape that's luxurious but wonderful for kids." },
  { label: "Wellness retreats", prompt: "A wellness retreat with an exceptional spa." },
];

export function CategoryPills() {
  const send = useConversation((s) => s.send);

  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2.5">
      {CATEGORIES.map((c, i) => (
        <motion.button
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 + i * 0.05 }}
          onClick={() => send(c.prompt)}
          className="rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-sm text-foreground/80 transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
        >
          {c.label}
        </motion.button>
      ))}
    </div>
  );
}
