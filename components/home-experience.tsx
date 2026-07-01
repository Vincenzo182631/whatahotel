"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useConversation } from "@/store/conversation-store";
import { SiteHeader } from "@/components/layout/site-header";
import { AirbnbLanding } from "@/components/airbnb-landing";
import { ChatInterface } from "@/components/chat/chat-interface";

export function HomeExperience() {
  const started = useConversation((s) => s.started);

  return (
    <main className="min-h-dvh">
      {started && <SiteHeader />}
      <AnimatePresence mode="wait">
        {started ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ChatInterface />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AirbnbLanding />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
