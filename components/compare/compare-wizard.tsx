"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Scale, CalendarDays, ArrowRight, Star } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import type { CityGroup } from "@/hooks/use-hotels";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Compare wizard. Step 1: pick a city + travel dates. Step 2: choose two hotels
 * available in that city. Then navigate to /compare with the dates so the
 * comparison page can show live, date-specific pricing.
 */
export function CompareWizard({
  open,
  onClose,
  cities,
}: {
  open: boolean;
  onClose: () => void;
  cities: CityGroup[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cityKey, setCityKey] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const city = cities.find((c) => c.key === cityKey);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);

  if (!open) return null;

  const canContinue = Boolean(cityKey && nights > 0);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id],
    );

  const reset = () => {
    setStep(1);
    setSelected([]);
  };
  const close = () => {
    reset();
    onClose();
  };

  const go = () => {
    if (selected.length !== 2) return;
    close();
    router.push(
      `/compare?a=${selected[0]}&b=${selected[1]}&checkIn=${checkIn}&checkOut=${checkOut}`,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white text-[#222] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBEBEB] px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Scale className="size-5 text-[#FF385C]" /> Compare hotels
          </h2>
          <button onClick={close} aria-label="Close" className="rounded-full p-1.5 text-[#717171] hover:bg-[#f7f7f7]">
            <X className="size-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pt-3 text-xs font-medium text-[#717171]">
          <span className={cn(step === 1 && "font-bold text-[#FF385C]")}>1. City & dates</span>
          <span>›</span>
          <span className={cn(step === 2 && "font-bold text-[#FF385C]")}>2. Pick two hotels</span>
        </div>

        {step === 1 ? (
          <div className="flex-1 overflow-y-auto p-5">
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium">Destination city</span>
              <select
                value={cityKey}
                onChange={(e) => { setCityKey(e.target.value); setSelected([]); }}
                className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20"
              >
                <option value="">Choose a city…</option>
                {cities.map((c) => (
                  <option key={c.key} value={c.key}>{c.label} · {c.count} hotels</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Check-in</span>
                <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Check-out</span>
                <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-[#DDDDDD] px-3.5 py-2.5 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20" />
              </label>
            </div>
            {checkIn && checkOut && nights <= 0 && (
              <p className="mt-2 text-sm text-[#E61E4D]">Check-out must be after check-in.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-3 flex items-center gap-2 text-sm text-[#717171]">
              <CalendarDays className="size-4 text-[#FF385C]" />
              {city?.label} · {new Date(checkIn).toLocaleDateString()} → {new Date(checkOut).toLocaleDateString()} · {nights} night{nights > 1 ? "s" : ""}
            </div>
            <p className="mb-4 text-sm font-medium">
              Select <span className="text-[#FF385C]">two</span> hotels to compare ({selected.length}/2)
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {city?.hotels.map((h) => {
                const isSel = selected.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggle(h.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                      isSel ? "border-[#FF385C] bg-[#FF385C]/[0.04]" : "border-[#EBEBEB] hover:border-[#DDDDDD]",
                    )}
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#eee]">
                      <ImageWithFallback src={h.image} seed={h.id} alt={h.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{h.name}</p>
                      {h.brand && <p className="truncate text-xs text-[#717171]">{h.brand}</p>}
                      <p className="mt-0.5 text-xs text-[#222]">
                        <span className="font-semibold">{formatCurrency(h.startingRate)}</span> from / night
                      </p>
                    </div>
                    <span className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      isSel ? "border-[#FF385C] bg-[#FF385C] text-white" : "border-[#DDDDDD]",
                    )}>
                      {isSel && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#EBEBEB] px-5 py-4">
          {step === 1 ? (
            <>
              <span className="text-xs text-[#717171]">Live rates shown on the next step.</span>
              <button
                onClick={() => setStep(2)}
                disabled={!canContinue}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Continue <ArrowRight className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="text-sm font-medium text-[#717171] hover:text-[#222]">
                ← Back
              </button>
              <button
                onClick={go}
                disabled={selected.length !== 2}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                <Star className="size-4" /> Compare these two
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
