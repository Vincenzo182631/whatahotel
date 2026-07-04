"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BedDouble } from "lucide-react";

/**
 * Universal route-transition indicator. Fires on EVERY internal navigation
 * (client transitions included, not just server-suspended ones): a slim brand
 * gradient bar creeps across the top immediately, and — if the jump takes more
 * than a beat — a hotel-booking-themed pill fades in. Both clear when the new
 * page's pathname lands.
 */
const MESSAGES = ["Finding your stay…", "Checking live rates…", "Almost there…"];

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPill, setShowPill] = useState(false);
  const [msg, setMsg] = useState(0);

  const active = useRef(false);
  const creep = useRef<ReturnType<typeof setInterval> | null>(null);
  const pill = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycle = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (creep.current) clearInterval(creep.current);
    if (pill.current) clearTimeout(pill.current);
    if (safety.current) clearTimeout(safety.current);
    if (cycle.current) clearInterval(cycle.current);
  };

  const start = () => {
    if (active.current) return;
    active.current = true;
    if (hide.current) clearTimeout(hide.current);
    setVisible(true);
    setProgress(8);
    setMsg(0);
    creep.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const inc = p < 40 ? 9 : p < 70 ? 4 : 1.5;
        return Math.min(90, p + inc);
      });
    }, 280);
    pill.current = setTimeout(() => {
      setShowPill(true);
      cycle.current = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 1300);
    }, 200);
    safety.current = setTimeout(() => finish(), 10000);
  };

  const finish = () => {
    if (!active.current) return;
    active.current = false;
    clearTimers();
    setProgress(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setShowPill(false);
      setProgress(0);
    }, 300);
  };

  // Complete when the destination pathname lands.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Detect navigation start from every source:
  //  • <a>/<Link> clicks (instant feedback)
  //  • programmatic router.push/replace — hotel cards, "View rooms" → /stay,
  //    "Compare" → /compare — which go through history.pushState, not an anchor
  //  • browser back/forward (popstate)
  useEffect(() => {
    const differsFromCurrent = (href: string | URL | null | undefined) => {
      if (!href) return false;
      try {
        const u = new URL(href.toString(), window.location.href);
        return u.origin === window.location.origin && u.pathname !== window.location.pathname;
      } catch {
        return false;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      const target = a.getAttribute("target");
      if ((target && target !== "_self") || a.hasAttribute("download")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;
      if (differsFromCurrent(href)) start();
    };
    const onPop = () => start();

    // Patch history so programmatic navigations trigger the loader too. Compares
    // against the current pathname *before* the URL changes, so same-page query
    // updates (e.g. the date picker) don't flash the bar.
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      if (differsFromCurrent(args[2])) start();
      return origPush.apply(this, args);
    };
    window.history.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
      if (differsFromCurrent(args[2])) start();
      return origReplace.apply(this, args);
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPop);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      clearTimers();
      if (hide.current) clearTimeout(hide.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Top gradient bar */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
        style={{ opacity: progress >= 100 ? 0 : 1, transition: "opacity 250ms ease" }}
        aria-hidden
      >
        <div
          className="h-full rounded-r-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #FF5A78 0%, #FF385C 55%, #E61E4D 100%)",
            boxShadow: "0 0 10px rgba(255,56,92,0.6)",
            transition: "width 280ms ease",
          }}
        />
      </div>

      {/* Delayed booking-themed pill */}
      {showPill && (
        <div
          className="pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-black/[0.06] bg-white/90 px-4 py-2 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <span className="relative grid size-5 place-items-center">
              <span
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  animationDuration: "0.8s",
                  background: "conic-gradient(from 90deg, rgba(255,56,92,0) 0%, #FF385C 100%)",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
                }}
              />
              <BedDouble className="size-3 text-[#FF385C]" strokeWidth={2} />
            </span>
            <span className="text-[13px] font-medium text-[#1a1a1a]">{MESSAGES[msg]}</span>
          </div>
        </div>
      )}
    </>
  );
}
