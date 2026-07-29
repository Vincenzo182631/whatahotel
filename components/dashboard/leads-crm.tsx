"use client";

import { useMemo, useState } from "react";
import { MapPin, StickyNote, Loader2, Check, Columns2, ExternalLink } from "lucide-react";
import type { Lead, LeadStage } from "@/lib/data/types";

const STAGES: { key: LeadStage; label: string; dot: string; chip: string }[] = [
  { key: "new", label: "New", dot: "bg-[#2F6FED]", chip: "bg-[#2F6FED]/10 text-[#2F6FED] border-[#2F6FED]/30" },
  { key: "contacted", label: "Contacted", dot: "bg-[#C2790B]", chip: "bg-[#C2790B]/10 text-[#9A6008] border-[#C2790B]/30" },
  { key: "quoted", label: "Quoted", dot: "bg-[#7A4FD0]", chip: "bg-[#7A4FD0]/10 text-[#6438C0] border-[#7A4FD0]/30" },
  { key: "booked", label: "Booked", dot: "bg-[#0E8F5E]", chip: "bg-[#1CA672]/12 text-[#0E8F5E] border-[#1CA672]/30" },
  { key: "lost", label: "Lost", dot: "bg-[#9a9a9a]", chip: "bg-black/[0.05] text-[#717171] border-black/10" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const stageOf = (l: Lead): LeadStage => l.stage ?? "new";

export function LeadsCrm({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [filter, setFilter] = useState<LeadStage | "all">("all");
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const s of STAGES) c[s.key] = 0;
    for (const l of leads) c[stageOf(l)]++;
    return c;
  }, [leads]);

  const visible = filter === "all" ? leads : leads.filter((l) => stageOf(l) === filter);

  const patch = async (id: string, body: Partial<Pick<Lead, "stage" | "notes">>) => {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (res.ok) {
        const { lead } = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...lead } : l)));
        setSavedFlash(id);
        setTimeout(() => setSavedFlash((f) => (f === id ? null : f)), 1500);
      }
    } catch {
      /* ignore — the select/textarea keep the attempted value */
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-[#717171]">
            {leads.length} {leads.length === 1 ? "person has" : "people have"} signed up from the chat. Track each one to a booking.
          </p>
        </div>
      </div>

      {/* Stage filter / pipeline summary */}
      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
        {STAGES.map((s) => (
          <FilterChip
            key={s.key}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
            label={s.label}
            count={counts[s.key]}
            dot={s.dot}
          />
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-[#EBEBEB] bg-white p-8 text-center text-sm text-[#717171]">
          No leads yet. They&apos;ll appear here as visitors sign up at the chat gate.
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {visible.map((l) => {
            const s = STAGE_MAP[stageOf(l)];
            const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || "—";
            const isOpen = openNotes === l.id;
            return (
              <div key={l.id} className="rounded-2xl border border-[#EBEBEB] bg-white">
                <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  {/* Identity */}
                  <div className="min-w-0 sm:w-56">
                    <p className="truncate text-sm font-semibold text-[#1a1a1a]">{name}</p>
                    <a href={`mailto:${l.email}`} className="truncate block text-xs text-[#FF385C] hover:underline">
                      {l.email}
                    </a>
                  </div>

                  {/* Trip */}
                  <div className="min-w-0 flex-1 text-xs text-[#555]">
                    {l.city ? (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <MapPin className="size-3 text-[#FF385C]" /> {l.city}
                      </span>
                    ) : (
                      <span className="text-[#bbb]">No destination yet</span>
                    )}
                    {l.checkIn && l.checkOut && (
                      <span className="block text-[#9a9a9a]">{fmt(l.checkIn)} → {fmt(l.checkOut)}</span>
                    )}
                  </div>

                  {/* Source + date */}
                  <div className="hidden text-xs text-[#9a9a9a] md:block md:w-28">
                    <span className="capitalize">{l.source.replace("-", " ")}</span>
                    <span className="block">{fmt(l.createdAt)}</span>
                  </div>

                  {/* Stage + notes controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={stageOf(l)}
                        onChange={(e) => patch(l.id, { stage: e.target.value as LeadStage })}
                        className={`cursor-pointer appearance-none rounded-full border px-3 py-1.5 pr-7 text-xs font-semibold outline-none ${s.chip}`}
                      >
                        {STAGES.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-60">▼</span>
                    </div>
                    <button
                      onClick={() => setOpenNotes(isOpen ? null : l.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        l.notes ? "border-[#FF385C]/30 bg-[#FF385C]/[0.06] text-[#FF385C]" : "border-[#EBEBEB] text-[#717171] hover:bg-[#f7f7f7]"
                      }`}
                      title="Notes"
                    >
                      <StickyNote className="size-3.5" />
                      {savedFlash === l.id ? <Check className="size-3" /> : saving[l.id] ? <Loader2 className="size-3 animate-spin" /> : null}
                    </button>
                  </div>
                </div>

                {l.comparisons?.length ? (
                  <a
                    href={l.comparisons[0].path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 border-t border-[#F2F2F2] px-3.5 py-2 text-xs font-medium text-[#FF385C] hover:bg-[#FF385C]/[0.03]"
                  >
                    <Columns2 className="size-3.5 shrink-0" />
                    <span className="truncate">
                      Comparing {l.comparisons[0].hotelIds.length} hotels
                      {l.comparisons[0].city ? ` in ${l.comparisons[0].city}` : ""}
                      {l.comparisons[0].checkIn && l.comparisons[0].checkOut
                        ? ` · ${fmt(l.comparisons[0].checkIn)} → ${fmt(l.comparisons[0].checkOut)}`
                        : ""}
                      {l.comparisons.length > 1 ? ` · +${l.comparisons.length - 1} more` : ""}
                    </span>
                    <ExternalLink className="ml-auto size-3.5 shrink-0" />
                  </a>
                ) : null}

                {isOpen && (
                  <div className="border-t border-[#F2F2F2] p-3.5">
                    <textarea
                      defaultValue={l.notes ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (l.notes ?? "")) patch(l.id, { notes: e.target.value });
                      }}
                      placeholder="Add a private note — e.g. called, prefers beachfront, budget ~$600/night…"
                      className="min-h-20 w-full resize-y rounded-xl border border-[#DDDDDD] px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20"
                    />
                    <p className="mt-1 text-[11px] text-[#9a9a9a]">Saved automatically when you click away.</p>
                  </div>
                )}
              </div>
            );
          })}
          {visible.length === 0 && (
            <p className="rounded-2xl border border-[#EBEBEB] bg-white p-8 text-center text-sm text-[#717171]">
              No leads in this stage.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "border-[#222] bg-[#222] text-white" : "border-[#EBEBEB] bg-white text-[#555] hover:bg-[#f7f7f7]"
      }`}
    >
      {dot && <span className={`size-1.5 rounded-full ${active ? "bg-white" : dot}`} />}
      {label}
      <span className={active ? "text-white/70" : "text-[#9a9a9a]"}>{count}</span>
    </button>
  );
}
