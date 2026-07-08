"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Loader2, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceStore } from "@/store/voice-store";
import { OPENAI_VOICES, VOICE_SAMPLE } from "@/lib/voice/voices";
import { listBrowserVoices, ttsSupported } from "@/lib/voice/speech";
import { speakText, stopSpeaking } from "@/lib/voice/tts";

/**
 * Popover to choose the advisor's voice: the natural OpenAI voices (default) or
 * the free browser voice, each with a play-to-preview. Selecting a voice both
 * saves it and previews it, so the guest hears exactly what they picked.
 */
export function VoiceMenu({ onClose }: { onClose: () => void }) {
  const { provider, openaiVoice, browserVoiceURI, setProvider, setOpenaiVoice, setBrowserVoiceURI } =
    useVoiceStore();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<{ uri: string; label: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () =>
      setBrowserVoices(
        listBrowserVoices().map((v) => ({ uri: v.voiceURI, label: `${v.name} (${v.lang})` })),
      );
    load();
    if (ttsSupported()) window.speechSynthesis.onvoiceschanged = load;
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => () => stopSpeaking(), []);

  const preview = async (key: string, opts: { provider: "openai" | "browser"; voice?: string; voiceURI?: string }) => {
    if (previewing === key) {
      stopSpeaking();
      setPreviewing(null);
      return;
    }
    setPreviewing(key);
    await speakText(VOICE_SAMPLE, {
      provider: opts.provider,
      voice: opts.voice,
      voiceURI: opts.voiceURI,
      onEnd: () => setPreviewing((p) => (p === key ? null : p)),
    });
  };

  const selectOpenai = (id: string) => {
    setProvider("openai");
    setOpenaiVoice(id);
    preview(`o:${id}`, { provider: "openai", voice: id });
  };
  const selectBrowser = (uri: string) => {
    setProvider("browser");
    setBrowserVoiceURI(uri);
    preview(`b:${uri}`, { provider: "browser", voiceURI: uri });
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 z-50 mb-2 w-[min(88vw,20rem)] rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-sm font-semibold text-[#1a1a1a]">Advisor voice</p>
        <button onClick={onClose} aria-label="Close" className="text-[#9a9a9a] hover:text-[#1a1a1a]">
          <X className="size-4" />
        </button>
      </div>

      {/* Engine switch */}
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-black/[0.04] p-1">
        <button
          onClick={() => setProvider("openai")}
          className={cn(
            "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
            provider === "openai" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#717171]",
          )}
        >
          Natural
        </button>
        <button
          onClick={() => setProvider("browser")}
          className={cn(
            "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
            provider === "browser" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#717171]",
          )}
        >
          Basic (free)
        </button>
      </div>

      <div className="no-scrollbar max-h-72 space-y-1 overflow-y-auto pr-0.5">
        {provider === "openai"
          ? OPENAI_VOICES.map((v) => {
              const key = `o:${v.id}`;
              const selected = openaiVoice === v.id;
              return (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                    selected ? "border-[#FF385C]/40 bg-[#FF385C]/[0.05]" : "border-transparent hover:bg-black/[0.03]",
                  )}
                >
                  <button
                    onClick={() => preview(key, { provider: "openai", voice: v.id })}
                    aria-label={`Preview ${v.label}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.05] text-[#333] hover:bg-black/10"
                  >
                    {previewing === key ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  </button>
                  <button onClick={() => selectOpenai(v.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-medium text-[#1a1a1a]">{v.label}</span>
                    <span className="block truncate text-xs text-[#717171]">{v.blurb}</span>
                  </button>
                  {selected && <Check className="size-4 shrink-0 text-[#FF385C]" strokeWidth={3} />}
                </div>
              );
            })
          : browserVoices.length === 0
            ? <p className="px-2 py-3 text-xs text-[#717171]">No browser voices available on this device.</p>
            : browserVoices.map((v) => {
                const key = `b:${v.uri}`;
                const selected = browserVoiceURI === v.uri;
                return (
                  <div
                    key={v.uri}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                      selected ? "border-[#FF385C]/40 bg-[#FF385C]/[0.05]" : "border-transparent hover:bg-black/[0.03]",
                    )}
                  >
                    <button
                      onClick={() => preview(key, { provider: "browser", voiceURI: v.uri })}
                      aria-label={`Preview ${v.label}`}
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.05] text-[#333] hover:bg-black/10"
                    >
                      {previewing === key ? <Square className="size-3.5 fill-current" /> : <Play className="size-4" />}
                    </button>
                    <button onClick={() => selectBrowser(v.uri)} className="min-w-0 flex-1 truncate text-left text-sm text-[#1a1a1a]">
                      {v.label}
                    </button>
                    {selected && <Check className="size-4 shrink-0 text-[#FF385C]" strokeWidth={3} />}
                  </div>
                );
              })}
      </div>

      <p className="mt-2 px-1 text-[11px] leading-snug text-[#9a9a9a]">
        {provider === "openai"
          ? "Natural voices use AI text-to-speech."
          : "Basic voices are built into your browser — free, quality varies."}
      </p>
    </div>
  );
}
