"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicUser } from "@/lib/data/types";

export interface ProfileInput {
  name?: string;
  phone?: string;
  city?: string;
  country?: string;
  bio?: string;
  travelerType?: string;
}

const ME_KEY = ["auth", "me"];

async function fetchMe(): Promise<{ user: PublicUser | null }> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return { user: null };
  return res.json();
}

/** Current signed-in user (null when logged out). */
export function useAuth() {
  const q = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 30_000 });
  return {
    user: q.data?.user ?? null,
    isLoading: q.isLoading,
    isAuthenticated: Boolean(q.data?.user),
  };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data as T;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      post<{ user: PublicUser }>("/api/auth/login", input),
    onSuccess: (d) => qc.setQueryData(ME_KEY, { user: d.user }),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      post<{ user: PublicUser }>("/api/auth/signup", input),
    onSuccess: (d) => qc.setQueryData(ME_KEY, { user: d.user }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ ok: true }>("/api/auth/logout", {}),
    onSuccess: () => qc.setQueryData(ME_KEY, { user: null }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) =>
      fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Update failed");
        return d as { user: PublicUser };
      }),
    onSuccess: (d) => qc.setQueryData(ME_KEY, { user: d.user }),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: "free" | "premium") =>
      post<{ user: PublicUser }>("/api/subscription", { plan }),
    onSuccess: (d) => qc.setQueryData(ME_KEY, { user: d.user }),
  });
}
