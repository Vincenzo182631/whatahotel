"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page throws while rendering — offers a retry instead of a blank screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center text-[#222]">
      <Link href="/" aria-label="What a Hotel — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="What a Hotel" className="h-9 w-auto" />
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight md:text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-[#717171]">
        We hit a problem loading this page. Please try again — if it keeps happening, contact your
        advisor and we&apos;ll help directly.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-[#DDDDDD] px-5 py-2.5 text-sm font-semibold hover:bg-black/[0.03]">
          Back to home
        </Link>
      </div>
    </main>
  );
}
