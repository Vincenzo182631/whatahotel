"use client";

import { motion } from "framer-motion";
import { Hotel, Palmtree, Users, Flower2, type LucideIcon } from "lucide-react";
import { useConversation } from "@/store/conversation-store";

const CATEGORIES: { icon: LucideIcon; label: string; prompt: string }[] = [
  { icon: Hotel, label: "Boutique stays", prompt: "Show me intimate boutique luxury stays with real character." },
  { icon: Palmtree, label: "Beach resorts", prompt: "Find me a beachfront luxury resort with an incredible pool." },
  { icon: Users, label: "Family escapes", prompt: "A family escape that's luxurious but wonderful for kids." },
  { icon: Flower2, label: "Wellness retreats", prompt: "A wellness retreat with an exceptional spa." },
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
          className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-foreground/80 shadow-[0_10px_30px_-14px_rgba(16,33,58,0.5)] ring-1 ring-black/[0.04] backdrop-blur transition-all hover:-translate-y-0.5 hover:text-primary"
        >
          <c.icon className="size-4 text-primary" strokeWidth={1.5} />
          {c.label}
        </motion.button>
      ))}
    </div>
  );
}
