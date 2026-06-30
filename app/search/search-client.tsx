"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useConversation } from "@/store/conversation-store";

export function SearchClient() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const send = useConversation((s) => s.send);
  const started = useConversation((s) => s.started);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (q && !started) send(q);
  }, [q, started, send]);

  return <ChatInterface />;
}
