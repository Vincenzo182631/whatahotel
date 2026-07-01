"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutGrid,
  User,
  Luggage,
  Heart,
  Crown,
  Sparkles,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/use-auth";
import type { PublicUser } from "@/lib/data/types";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
  { href: "/dashboard/trips", label: "My Trips", icon: Luggage },
  { href: "/dashboard/saved", label: "Saved Hotels", icon: Heart },
  { href: "/dashboard/subscription", label: "Subscription", icon: Crown },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Sparkles },
];

export function DashboardChrome({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const onLogout = () =>
    logout.mutate(undefined, { onSuccess: () => router.replace("/") });

  return (
    <div className="min-h-dvh bg-[#f7f7f7] text-[#222]">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="shrink-0 border-b border-[#EBEBEB] bg-white lg:min-h-dvh lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-5 py-4">
            <Link href="/" aria-label="What a Hotel — home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="What a Hotel" className="h-7 w-auto" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#717171] hover:text-[#FF385C] lg:hidden"
            >
              <ArrowLeft className="size-3.5" /> Site
            </Link>
          </div>

          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[#FF385C]/10 text-[#FF385C]"
                      : "text-[#222] hover:bg-[#f7f7f7]",
                  )}
                >
                  <item.icon className="size-4" strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden border-t border-[#EBEBEB] px-3 py-4 lg:block">
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <span className="grid size-8 place-items-center rounded-full bg-[#FF385C] text-sm font-bold text-white">
                {(user.name?.[0] ?? "U").toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-[#717171]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#222] transition-colors hover:bg-[#f7f7f7]"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8">
          <div className="lg:hidden mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold">{user.name}</span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#717171] hover:text-[#FF385C]"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
