"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Right-edge drag scrubber for long pages (mounted app-wide in the root layout).
 * A vertical track pinned to the right with a grab handle: drag it up/down to
 * scrub the whole page, or click anywhere on the track to jump there. The handle
 * also follows normal scrolling, so it doubles as a position indicator. The handle
 * uses the brand/icon colour (#FF385C) so it pops on both light and dark pages.
 * Hides itself when the page isn't tall enough to scroll. Pointer events cover
 * mouse + touch; arrow / page / home / end keys work when focused.
 */

const HANDLE = 48; // px — handle height

export function ScrollScrubber() {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false); // synchronous flag — avoids the stale-state race in pointermove
  const [frac, setFrac] = useState(0); // 0..1 scroll progress
  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const syncFromScroll = useCallback(() => {
    const max = maxScroll();
    setScrollable(max > 60);
    setFrac(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
  }, []);

  useEffect(() => {
    syncFromScroll();
    window.addEventListener("scroll", syncFromScroll, { passive: true });
    window.addEventListener("resize", syncFromScroll);
    // Content height changes as images/rows load in — keep the handle in sync.
    const ro = new ResizeObserver(syncFromScroll);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", syncFromScroll);
      window.removeEventListener("resize", syncFromScroll);
      ro.disconnect();
    };
  }, [syncFromScroll]);

  // Map a pointer Y to a scroll fraction, centring the handle under the finger.
  const fracFromPointer = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const travel = rect.height - HANDLE;
    if (travel <= 0) return 0;
    const f = (clientY - rect.top - HANDLE / 2) / travel;
    return Math.min(1, Math.max(0, f));
  };

  const scrollToFrac = (f: number, smooth = false) => {
    setFrac(f);
    // NOTE: the page sets `scroll-behavior: smooth` globally, and behavior "auto"
    // inherits it — which makes each drag step animate and lag far behind the
    // handle. Force "instant" while scrubbing so the page tracks the handle 1:1;
    // only keyboard steps animate.
    window.scrollTo({ top: f * maxScroll(), behavior: smooth ? "smooth" : "instant" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    scrollToFrac(fracFromPointer(e.clientY));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    scrollToFrac(fracFromPointer(e.clientY));
  };
  const endDrag = (e: React.PointerEvent) => {
    draggingRef.current = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.12;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      scrollToFrac(Math.min(1, frac + step), true);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      scrollToFrac(Math.max(0, frac - step), true);
    } else if (e.key === "Home") {
      e.preventDefault();
      scrollToFrac(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      scrollToFrac(1, true);
    }
  };

  if (!scrollable) return null;

  return (
    // Outer wrapper ignores pointer events so it never blocks the page; only the
    // track itself is interactive.
    <div className="pointer-events-none fixed right-0.5 top-20 bottom-4 z-30 print:hidden sm:right-1">
      <div
        ref={trackRef}
        role="slider"
        aria-label="Scroll the page up or down"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(frac * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="group pointer-events-auto relative h-full w-3.5 touch-none select-none"
      >
        {/* Faint brand-pink rail, hinted on hover/drag */}
        <span
          className={`absolute left-1/2 top-1 bottom-1 w-px -translate-x-1/2 rounded-full transition-colors ${
            dragging ? "bg-[#FF385C]/25" : "bg-transparent group-hover:bg-[#FF385C]/20"
          }`}
        />

        {/* Grab handle — hot-pink (#FF385C, the brand/icon colour) so it pops on
            both light and dark pages; widens slightly on hover / while dragging. */}
        <span
          className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-[3px] rounded-full bg-[#FF385C] text-white ring-1 ring-white/25 shadow-[0_4px_14px_-2px_rgba(255,56,92,0.65)] transition-[width,transform] ${
            dragging ? "w-3 scale-105" : "w-2.5 group-hover:w-3"
          }`}
          style={{ top: `calc((100% - ${HANDLE}px) * ${frac})`, height: HANDLE }}
        >
          {/* grip dots */}
          <span className="size-[3px] rounded-full bg-white/90" />
          <span className="size-[3px] rounded-full bg-white/90" />
          <span className="size-[3px] rounded-full bg-white/90" />
        </span>
      </div>

      {/* Position bubble — only while actively dragging */}
      {dragging && (
        <div
          className="pointer-events-none absolute right-4 flex -translate-y-1/2 items-center rounded-full bg-[#FF385C] px-2 py-1 text-[11px] font-semibold text-white shadow-lg"
          style={{ top: `calc(${HANDLE / 2}px + (100% - ${HANDLE}px) * ${frac})` }}
        >
          {Math.round(frac * 100)}%
        </div>
      )}
    </div>
  );
}
