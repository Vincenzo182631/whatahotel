"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: "hero" | "bar";
  autoFocus?: boolean;
}

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Where would you like to stay?",
  size = "bar",
  autoFocus,
}: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto";
    });
  };

  const isHero = size === "hero";

  return (
    <div
      className={cn(
        "group flex items-end gap-3 rounded-3xl glass-strong transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-glow",
        isHero ? "p-3 pl-6" : "p-2.5 pl-5",
      )}
    >
      <textarea
        ref={ref}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
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
        className={cn(
          "no-scrollbar flex-1 resize-none bg-transparent py-2 text-foreground placeholder:text-foreground/55 focus:outline-none disabled:opacity-60",
          isHero ? "text-lg" : "text-base",
        )}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className={cn(
          "grid shrink-0 place-items-center rounded-2xl bg-gold-sheen text-white transition-all duration-300 hover:brightness-105 disabled:opacity-40 disabled:saturate-50",
          isHero ? "size-12" : "size-10",
        )}
      >
        <ArrowUp className={isHero ? "size-5" : "size-4"} />
      </button>
    </div>
  );
}
