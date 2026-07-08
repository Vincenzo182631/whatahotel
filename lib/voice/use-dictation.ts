"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRecognitionCtor, type SpeechRecognitionLike, cancelSpeech } from "./speech";

/**
 * Microphone dictation for the chat composer. Wraps the Web Speech API's
 * SpeechRecognition: tap to start, speak, and the transcript streams back via
 * `onInterim` (live) and `onFinal` (settled). Auto-stops on a natural pause.
 */
export function useDictation({
  onInterim,
  onFinal,
}: {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  // Keep the latest callbacks without re-creating the recognizer each render.
  const cbRef = useRef({ onInterim, onFinal });
  cbRef.current = { onInterim, onFinal };

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || listening) return;
    cancelSpeech(); // don't dictate over the advisor's own voice

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    finalRef.current = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      const live = (finalRef.current + interim).trim();
      if (live) cbRef.current.onInterim?.(live);
    };
    rec.onerror = () => {
      /* onend still fires; surfaced as no transcript */
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const text = finalRef.current.trim();
      if (text) cbRef.current.onFinal?.(text);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      recRef.current = null;
    }
  }, [listening]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Clean up if the composer unmounts mid-listen.
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { listening, supported, start, stop, toggle };
}
