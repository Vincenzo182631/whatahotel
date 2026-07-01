import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#EBEBEB] bg-white p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#717171]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#717171]">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#717171]">{hint}</p>}
    </Card>
  );
}

export function PremiumBadge({ tier }: { tier: "free" | "premium" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        tier === "premium"
          ? "bg-[#FF385C] text-white"
          : "bg-[#EBEBEB] text-[#717171]",
      )}
    >
      {tier === "premium" ? "Premium" : "Free"}
    </span>
  );
}
