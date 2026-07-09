"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Mic, Loader2, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "connecting" | "live" | "error";

export interface RealtimeSessionParams {
  /** "compare" grounds the advisor in a specific comparison page. */
  mode?: "compare";
  ids?: string[];
  checkIn?: string;
  checkOut?: string;
}

/**
 * Real-time voice advisor over OpenAI's Realtime API (WebRTC). The guest talks
 * and the advisor listens + replies in real time, calling our live hotel search
 * as a tool so answers are grounded. Renders as a full-screen call overlay.
 * Pass `session` to ground it in a specific comparison page instead.
 */
export function RealtimeVoice({
  onClose,
  session,
}: {
  onClose: () => void;
  session?: RealtimeSessionParams;
}) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [speaking, setSpeaking] = useState(false); // advisor is talking
  const [error, setError] = useState<string | null>(null);
  const [lastUser, setLastUser] = useState("");
  const [lastAdvisor, setLastAdvisor] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advisorBuf = useRef("");

  const hangUp = () => {
    try { dcRef.current?.close(); } catch {}
    try { micRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    if (audioRef.current) audioRef.current.srcObject = null;
    onClose();
  };

  useEffect(() => {
    let cancelled = false;

    async function runTool(name: string, callId: string, argsStr: string) {
      let args: { city?: string; checkIn?: string; checkOut?: string } = {};
      try { args = JSON.parse(argsStr || "{}"); } catch {}
      let result: unknown = { hotels: [] };
      if (name === "search_hotels" && args.city) {
        try {
          const url =
            args.checkIn && args.checkOut
              ? `/api/live-search?city=${encodeURIComponent(args.city)}&checkIn=${args.checkIn}&checkOut=${args.checkOut}`
              : `/api/live-search?q=${encodeURIComponent(args.city)}`;
          const d = await fetch(url).then((r) => r.json());
          const hotels = (d.hotels ?? []).slice(0, 6).map((h: { name: string; city?: string; country?: string; approxNightly?: number; currency?: string }) => ({
            name: h.name,
            location: [h.city, h.country].filter(Boolean).join(", "),
            approxNightly: h.approxNightly,
            currency: h.currency,
          }));
          result = {
            hotels,
            note: args.checkIn && args.checkOut ? undefined : "No dates provided — ask the guest for check-in and check-out before quoting rates.",
          };
        } catch {
          result = { hotels: [], note: "Live search failed; try again." };
        }
      }
      const dc = dcRef.current;
      if (!dc || dc.readyState !== "open") return;
      dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) } }));
      dc.send(JSON.stringify({ type: "response.create" }));
    }

    function onEvent(e: MessageEvent) {
      let msg: { type?: string; [k: string]: unknown };
      try { msg = JSON.parse(e.data); } catch { return; }
      const type = msg.type || "";
      // Advisor spoken-text transcript (event names vary by API version).
      if (type.includes("output_audio_transcript.delta") || type.includes("audio_transcript.delta")) {
        advisorBuf.current += (msg.delta as string) || "";
        setLastAdvisor(advisorBuf.current);
        setSpeaking(true);
      } else if (type.includes("output_audio_transcript.done") || type.includes("audio_transcript.done")) {
        setSpeaking(false);
        advisorBuf.current = "";
      } else if (type === "conversation.item.input_audio_transcription.completed") {
        setLastUser((msg.transcript as string) || "");
        advisorBuf.current = "";
        setLastAdvisor("");
      } else if (type === "input_audio_buffer.speech_started") {
        setSpeaking(false);
      } else if (type === "response.function_call_arguments.done") {
        void runTool((msg.name as string) || "", (msg.call_id as string) || "", (msg.arguments as string) || "");
      } else if (type === "error") {
        console.error("realtime error event", msg);
      }
    }

    async function connect() {
      try {
        const sess = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session ?? {}),
        }).then((r) => r.json());
        if (cancelled) return;
        if (!sess?.value) throw new Error(sess?.error || "no session");

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
        pc.ontrack = (ev) => { audio.srcObject = ev.streams[0]; };

        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { mic.getTracks().forEach((t) => t.stop()); return; }
        micRef.current = mic;
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = onEvent;
        dc.onopen = () => !cancelled && setPhase("live");

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // GA WebRTC endpoint; fall back to the legacy path if unavailable.
        const post = (endpoint: string) =>
          fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${sess.value}`, "Content-Type": "application/sdp" },
            body: offer.sdp || "",
          });
        let sdpRes = await post(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(sess.model)}`);
        if (!sdpRes.ok) sdpRes = await post(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(sess.model)}`);
        if (!sdpRes.ok) throw new Error("connect failed");
        const answer = await sdpRes.text();
        if (cancelled) return;
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (err) {
        if (cancelled) return;
        const name = (err as Error)?.name;
        setError(name === "NotAllowedError" ? "Microphone access was blocked. Allow the mic and try again." : "Couldn't start the voice call. Please try again.");
        setPhase("error");
      }
    }

    void connect();
    return () => {
      cancelled = true;
      try { dcRef.current?.close(); } catch {}
      try { micRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      try { pcRef.current?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#0e0e10] p-6 text-white">
      <button
        onClick={hangUp}
        aria-label="Close"
        className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <p className="text-sm font-semibold uppercase tracking-widest text-white/50">WhataHotel Advisor</p>

      {/* Orb */}
      <div className="relative my-10 grid place-items-center">
        <span
          className={cn(
            "absolute rounded-full bg-[#FF385C]/30 transition-all duration-500",
            phase === "live" && speaking ? "size-52 animate-ping" : "size-40",
          )}
        />
        <span className="absolute size-40 rounded-full bg-[#FF385C]/20" />
        <span className="relative grid size-28 place-items-center rounded-full bg-[#FF385C] shadow-[0_0_60px_rgba(255,56,92,0.6)]">
          {phase === "connecting" ? <Loader2 className="size-10 animate-spin" /> : <Mic className="size-10" />}
        </span>
      </div>

      <p className="text-lg font-medium">
        {phase === "connecting" && "Connecting…"}
        {phase === "live" && (speaking ? "Advisor is speaking…" : "Listening — just talk")}
        {phase === "error" && "Couldn't connect"}
      </p>
      {error && <p className="mt-2 max-w-sm text-center text-sm text-white/60">{error}</p>}

      {/* Live transcript */}
      {phase === "live" && (
        <div className="mt-6 min-h-[3.5rem] w-full max-w-md space-y-2 text-center">
          {lastUser && <p className="text-sm text-white/55">“{lastUser}”</p>}
          {lastAdvisor && <p className="text-[15px] leading-relaxed text-white/90">{lastAdvisor}</p>}
        </div>
      )}

      <button
        onClick={hangUp}
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
      >
        <PhoneOff className="size-4" /> End call
      </button>
      <p className="mt-4 text-xs text-white/40">Powered by OpenAI Realtime · grounded in live WhataHotel rates</p>
    </div>,
    document.body,
  );
}
