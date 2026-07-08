"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Loader2, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceStore, type VoiceProvider } from "@/store/voice-store";
import { OPENAI_VOICES, ELEVEN_VOICES, VOICE_SAMPLE } from "@/lib/voice/voices";
import { listBrowserVoices, ttsSupported } from "@/lib/voice/speech";
import { speakText, stopSpeaking } from "@/lib/voice/tts";

type ProvAvail = { openai: boolean; elevenlabs: boolean };

/**
 * Popover to choose the advisor's voice across three engines: OpenAI (Natural,
 * default), ElevenLabs (Premium, needs a paid key) and the free browser voice.
 * Each voice has a play-to-preview; selecting saves and previews it.
 */
export function VoiceMenu({ onClose }: { onClose: () => void }) {
  const {
    provider, openaiVoice, elevenVoice, browserVoiceURI,
    setProvider, setOpenaiVoice, setElevenVoice, setBrowserVoiceURI,
  } = useVoiceStore();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<{ uri: string; label: string }[]>([]);
  const [avail, setAvail] = useState<ProvAvail>({ openai: true, elevenlabs: false });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () =>
      setBrowserVoices(
        listBrowserVoices().map((v) => ({ uri: v.voiceURI, label: `${v.name} (${v.lang})` })),
      );
    load();
    if (ttsSupported()) window.speechSynthesis.onvoiceschanged = load;
    // Which server engines are configured (keys present)?
    fetch("/api/tts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { providers?: ProvAvail } | null) => d?.providers && setAvail(d.providers))
      .catch(() => {});
  }, []);

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

  const preview = async (key: string, opts: { provider: VoiceProvider; voice?: string; voiceURI?: string }) => {
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

  const tabs: { id: VoiceProvider; label: string }[] = [
    { id: "openai", label: "Natural" },
    { id: "elevenlabs", label: "Premium" },
    { id: "browser", label: "Basic" },
  ];

  const renderRow = (
    key: string,
    title: string,
    blurb: string | null,
    selected: boolean,
    onSelect: () => void,
    onPreview: () => void,
  ) => (
    <div
      key={key}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2.5 py-2",
        selected ? "border-[#FF385C]/40 bg-[#FF385C]/[0.05]" : "border-transparent hover:bg-black/[0.03]",
      )}
    >
      <button
        onClick={onPreview}
        aria-label={`Preview ${title}`}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.05] text-[#333] hover:bg-black/10"
      >
        {previewing === key ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      </button>
      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-[#1a1a1a]">{title}</span>
        {blurb && <span className="block truncate text-xs text-[#717171]">{blurb}</span>}
      </button>
      {selected && <Check className="size-4 shrink-0 text-[#FF385C]" strokeWidth={3} />}
    </div>
  );

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
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl bg-black/[0.04] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setProvider(t.id)}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
              provider === t.id ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#717171]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Premium (ElevenLabs) not-configured banner */}
      {provider === "elevenlabs" && !avail.elevenlabs && (
        <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-700">
          Premium voices need a paid ElevenLabs plan + <code>ELEVENLABS_API_KEY</code>. Until then,
          previews use the free browser voice.
        </p>
      )}

      <div className="no-scrollbar max-h-72 space-y-1 overflow-y-auto pr-0.5">
        {provider === "openai" &&
          OPENAI_VOICES.map((v) =>
            renderRow(
              `o:${v.id}`, v.label, v.blurb, openaiVoice === v.id,
              () => { setProvider("openai"); setOpenaiVoice(v.id); preview(`o:${v.id}`, { provider: "openai", voice: v.id }); },
              () => preview(`o:${v.id}`, { provider: "openai", voice: v.id }),
            ),
          )}

        {provider === "elevenlabs" &&
          ELEVEN_VOICES.map((v) =>
            renderRow(
              `e:${v.id}`, v.label, v.blurb, elevenVoice === v.id,
              () => { setProvider("elevenlabs"); setElevenVoice(v.id); preview(`e:${v.id}`, { provider: "elevenlabs", voice: v.id }); },
              () => preview(`e:${v.id}`, { provider: "elevenlabs", voice: v.id }),
            ),
          )}

        {provider === "browser" &&
          (browserVoices.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[#717171]">No browser voices available on this device.</p>
          ) : (
            browserVoices.map((v) =>
              renderRow(
                `b:${v.uri}`, v.label, null, browserVoiceURI === v.uri,
                () => { setProvider("browser"); setBrowserVoiceURI(v.uri); preview(`b:${v.uri}`, { provider: "browser", voiceURI: v.uri }); },
                () => preview(`b:${v.uri}`, { provider: "browser", voiceURI: v.uri }),
              ),
            )
          ))}
      </div>

      <p className="mt-2 px-1 text-[11px] leading-snug text-[#9a9a9a]">
        {provider === "openai"
          ? "Natural voices use AI text-to-speech."
          : provider === "elevenlabs"
            ? "Premium, most life-like voices via ElevenLabs."
            : "Basic voices are built into your browser — free, quality varies."}
      </p>
    </div>
  );
}
