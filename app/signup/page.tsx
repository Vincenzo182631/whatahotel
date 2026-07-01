"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell, Field, SubmitButton } from "@/components/auth/auth-shell";
import { useSignup } from "@/hooks/use-auth";

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { name, email, password },
      { onSuccess: () => router.replace("/dashboard") },
    );
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save hotels, track trips and unlock your AI travel advisor."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#FF385C] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Full name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {signup.isError && (
          <p className="text-sm text-[#E61E4D]">{(signup.error as Error).message}</p>
        )}
        <SubmitButton loading={signup.isPending}>Sign up</SubmitButton>
        <p className="text-center text-xs text-[#9a9a9a]">
          By signing up you agree to our Terms & Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
