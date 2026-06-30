"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ExamplePrompts } from "@/components/chat/suggested-prompts";
import { CategoryPills } from "@/components/sections/category-pills";
import { useConversation } from "@/store/conversation-store";

export function Hero() {
  const send = useConversation((s) => s.send);

  return (
    <section className="relative mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-primary/90"
      >
        Your personal luxury travel advisor
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="balance font-display text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
      >
        Where would you
        <br />
        like to{" "}
        <span className="text-gradient-gold italic">stay?</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="balance mt-6 max-w-xl text-lg leading-relaxed text-foreground/60"
      >
        Tell me how you want to feel — the occasion, the budget, the dream. I'll
        curate the world's finest hotels, explain every choice, and handle the
        booking. No forms. Just conversation.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="mt-10 w-full max-w-2xl"
      >
        <ChatComposer
          size="hero"
          autoFocus
          onSend={(t) => send(t)}
          placeholder="I want a beachfront resort in Bali under $700 a night…"
        />
        <CategoryPills />
        <ExamplePrompts onPick={(p) => send(p)} />
      </motion.div>

      {/* Trust strip */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 inline-flex items-center gap-2 text-sm text-foreground/50"
      >
        <Users className="size-4 text-primary/70" />
        Trusted by discerning travellers worldwide
      </motion.p>
    </section>
  );
}
