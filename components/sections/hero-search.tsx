"use client";

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useConversation } from "@/store/conversation-store";

/** The Travvi-style hero search card: big white box + AI label + Find button. */
export function HeroSearch() {
  const send = useConversation((s) => s.send);
  const isStreaming = useConversation((s) => s.isStreaming);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text || isStreaming) return;
    send(text);
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto";
    });
  };

  return (
    <div className="rounded-[1.75rem] bg-white p-3 text-left shadow-[0_30px_90px_-30px_rgba(16,33,58,0.45)] ring-1 ring-black/[0.05]">
      <textarea
        ref={ref}
        value={value}
        rows={2}
        onChange={(e) => {
          setValue(e.target.value);
          grow();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Tell me a city and what you want — e.g. the best spa hotels in Tokyo for a honeymoon under $1,300 a night"
        className="no-scrollbar w-full resize-none bg-transparent px-3 pt-3 pb-2 text-base leading-relaxed text-foreground placeholder:text-foreground/55 focus:outline-none"
      />
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-foreground/60">
          <Sparkles className="size-3.5 text-primary" strokeWidth={1.5} /> AI search
          &amp; ranking
        </span>
        <button
          onClick={submit}
          disabled={isStreaming || !value.trim()}
          className="inline-flex items-center gap-2 rounded-2xl bg-gold-sheen px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(183,79,84,0.6)] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
        >
          <Send className="size-4" strokeWidth={1.5} /> Find &amp; rank
        </button>
      </div>
    </div>
  );
}
