import Link from "next/link";
import type { ReactNode } from "react";

/** Centered card used by every auth screen — keeps the Airbnb white/coral look. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f7f7f7] px-4 py-10 text-[#222]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="What a Hotel — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-9 w-auto" />
          </Link>
        </div>
        <div className="rounded-2xl border border-[#EBEBEB] bg-white p-7 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.15)]">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[#717171]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-[#717171]">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#222]">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-[#DDDDDD] bg-white px-3.5 py-2.5 text-sm text-[#222] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20"
      />
    </label>
  );
}

export function SubmitButton({
  children,
  loading,
  ...props
}: { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full rounded-xl bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
