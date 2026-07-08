"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowUp, Mic, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictation } from "@/lib/voice/use-dictation";
import { ttsSupported, cancelSpeech } from "@/lib/voice/speech";
import { useVoiceStore } from "@/store/voice-store";

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
  placeholder = "Which hotels would you like to compare?",
  size = "bar",
  autoFocus,
}: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Voice: dictation (speech-to-text) + a toggle for spoken replies (TTS).
  const speakReplies = useVoiceStore((s) => s.speakReplies);
  const toggleSpeak = useVoiceStore((s) => s.toggleSpeak);
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => setCanSpeak(ttsSupported()), []);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submitText = (text: string) => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto";
    });
  };

  const { listening, supported: micSupported, toggle: toggleMic } = useDictation({
    // Live transcript fills the box as the guest speaks.
    onInterim: (t) => {
      setValue(t);
      requestAnimationFrame(grow);
    },
    // On a natural pause, send it automatically — hands-free.
    onFinal: (t) => submitText(t),
  });

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => submitText(value);
  const isHero = size === "hero";

  return (
    <div
      className={cn(
        "group flex items-end gap-2 rounded-3xl glass-strong transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-glow",
        isHero ? "p-3 pl-6" : "p-2.5 pl-5",
      )}
    >
      <textarea
        ref={ref}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder={listening ? "Listening…" : placeholder}
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

      {/* Speaker toggle — read the advisor's replies aloud. */}
      {canSpeak && (
        <button
          type="button"
          onClick={() => {
            if (speakReplies) cancelSpeech();
            toggleSpeak();
          }}
          aria-pressed={speakReplies}
          aria-label={speakReplies ? "Turn off spoken replies" : "Read replies aloud"}
          title={speakReplies ? "Spoken replies on" : "Read replies aloud"}
          className={cn(
            "grid shrink-0 place-items-center rounded-2xl transition-colors",
            isHero ? "size-12" : "size-10",
            speakReplies
              ? "bg-primary/12 text-primary"
              : "text-foreground/55 hover:bg-black/[0.05] hover:text-foreground",
          )}
        >
          {speakReplies ? <Volume2 className={isHero ? "size-5" : "size-4"} /> : <VolumeX className={isHero ? "size-5" : "size-4"} />}
        </button>
      )}

      {/* Microphone — dictate instead of typing. */}
      {micSupported && (
        <button
          type="button"
          onClick={toggleMic}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : "Speak your message"}
          title={listening ? "Stop" : "Speak"}
          className={cn(
            "relative grid shrink-0 place-items-center rounded-2xl transition-colors disabled:opacity-40",
            isHero ? "size-12" : "size-10",
            listening
              ? "bg-primary text-white"
              : "text-foreground/55 hover:bg-black/[0.05] hover:text-foreground",
          )}
        >
          {listening && <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/40" />}
          <Mic className={cn("relative", isHero ? "size-5" : "size-4")} />
        </button>
      )}

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
