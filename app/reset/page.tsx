"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, Field, SubmitButton } from "@/components/auth/auth-shell";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setDevLink(data.devResetLink ?? null);
    setSent(true);
    setLoading(false);
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-semibold text-[#FF385C] hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4 text-sm text-[#222]">
          <p>
            If an account exists for <span className="font-medium">{email}</span>, a reset
            link is on its way.
          </p>
          {devLink && (
            <div className="rounded-xl border border-[#EBEBEB] bg-[#f7f7f7] p-3 text-xs">
              <p className="mb-1 font-medium text-[#717171]">
                Dev mode (no email provider configured):
              </p>
              <Link href={devLink} className="break-all font-semibold text-[#FF385C] hover:underline">
                {devLink}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
