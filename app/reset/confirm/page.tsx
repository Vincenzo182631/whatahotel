"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, Field, SubmitButton } from "@/components/auth/auth-shell";

function ConfirmForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.replace("/login");
  };

  if (!token)
    return <p className="text-sm text-[#E61E4D]">This reset link is missing its token.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-[#E61E4D]">{error}</p>}
      <SubmitButton loading={loading}>Set new password</SubmitButton>
    </form>
  );
}

export default function ResetConfirmPage() {
  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link href="/login" className="font-semibold text-[#FF385C] hover:underline">
          Back to log in
        </Link>
      }
    >
      <Suspense fallback={null}>
        <ConfirmForm />
      </Suspense>
    </AuthShell>
  );
}
