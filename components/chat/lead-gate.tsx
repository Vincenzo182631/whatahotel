"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  context?: { city?: string; checkIn?: string; checkOut?: string; exchanges?: number };
}

/**
 * Sign-up gate shown after a few chat exchanges. Captures the visitor as a lead
 * (First name, Last name, email) — or via Google when configured — and signs
 * them in so they can keep comparing. Recorded for the CRM.
 */
export function LeadGate({ context }: Props) {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const field =
    "w-full rounded-xl border border-black/[0.12] bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, source: "chat-gate", ...context }),
      });
      // Read defensively: a server error may return an empty / non-JSON body.
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          d?.error ||
            (res.status >= 500
              ? "Something went wrong on our end. Please try again in a moment."
              : "Something went wrong. Please try again."),
        );
        return;
      }
      // Signed in immediately — the auth query updates and the gate disappears.
      qc.setQueryData(["auth", "me"], { user: d.user });
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setNote(null);
    try {
      const d = await fetch("/api/auth/google").then((r) => r.json());
      if (d?.configured && d.url) {
        window.location.href = d.url;
      } else {
        setNote("Google sign-in is being set up — please continue with your email for now.");
      }
    } catch {
      setNote("Google sign-in isn't available right now — please continue with your email.");
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-white p-5 shadow-[0_12px_40px_-16px_rgba(255,56,92,0.35)]">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Sparkles className="size-3.5" /> Keep comparing
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[#1a1a1a]">Create a free account to continue</h3>
      <p className="mt-1 text-sm text-[#717171]">
        Save your shortlist and keep chatting with your advisor. It takes 10 seconds — no payment.
      </p>

      <button
        type="button"
        onClick={google}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.12] bg-white py-2.5 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-black/[0.03]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          className="size-4"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
        Continue with Google
      </button>
      {note && <p className="mt-2 text-xs text-[#717171]">{note}</p>}

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#9a9a9a]">
        <span className="h-px flex-1 bg-black/[0.08]" /> or <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <form onSubmit={submit} className="space-y-2.5">
        <div className="flex gap-2.5">
          <input className={field} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <input className={field} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <p className="text-sm text-[#E61E4D]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />} Continue to my hotels
        </button>
      </form>

      <p className="mt-3 text-[11px] leading-snug text-[#9a9a9a]">
        By continuing you agree we may email you about your trip. We never share your details.
      </p>
    </div>
  );
}
