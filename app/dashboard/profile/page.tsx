"use client";

import { useEffect, useState } from "react";
import { useAuth, useUpdateProfile } from "@/hooks/use-auth";
import { Card, PageHeader, PremiumBadge } from "@/components/dashboard/ui";
import { Field } from "@/components/auth/auth-shell";

const TRAVELER_OPTIONS = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "business", label: "Business" },
] as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    country: "",
    bio: "",
    travelerType: "couple",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      phone: user.profile.phone ?? "",
      city: user.profile.city ?? "",
      country: user.profile.country ?? "",
      bio: user.profile.bio ?? "",
      travelerType: user.profile.travelerType ?? "couple",
    });
  }, [user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    update.mutate(form, { onSuccess: () => setSaved(true) });
  };

  if (!user) return null;

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your personal and contact details." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Full name" value={form.name} onChange={set("name")} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#222]">Traveler type</span>
                  <select
                    value={form.travelerType}
                    onChange={set("travelerType")}
                    className="w-full rounded-xl border border-[#DDDDDD] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20"
                  >
                    {TRAVELER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City" value={form.city} onChange={set("city")} />
                <Field label="Country" value={form.country} onChange={set("country")} />
              </div>
              <Field label="About you" value={form.bio} onChange={set("bio")} placeholder="Travel style, preferences…" />

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={update.isPending}
                  className="rounded-xl bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {update.isPending ? "Saving…" : "Save changes"}
                </button>
                {saved && !update.isPending && (
                  <span className="text-sm text-[#008a05]">Saved ✓</span>
                )}
                {update.isError && (
                  <span className="text-sm text-[#E61E4D]">{(update.error as Error).message}</span>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-[#717171]">Account</p>
            <p className="mt-2 text-sm font-semibold">{user.email}</p>
            <p className="text-xs text-[#717171]">Email (used to sign in)</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-[#717171]">Membership</p>
            <div className="mt-2 flex items-center gap-2">
              <PremiumBadge tier={user.membership} />
              <span className="text-sm capitalize text-[#717171]">
                {user.subscription.status === "none" ? "no active plan" : user.subscription.status}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
