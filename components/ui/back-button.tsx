"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Goes to the ACTUAL previous page (browser history), not a fixed destination.
 * Falls back to `fallback` when there's no in-app history (e.g. the page was
 * opened directly or in a new tab).
 */
export function BackButton({
  fallback = "/",
  label = "Back",
  className,
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7]",
        className,
      )}
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}
