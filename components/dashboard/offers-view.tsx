"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Check, Link2, Send, ExternalLink, Sparkles, Eye } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface SearchHotel {
  sourceHotelId: string;
  name: string;
  city: string;
  country: string;
  image: string;
  approxNightly?: number;
  perk?: string | null;
}
interface Offer {
  id: string;
  guestName?: string;
  guestEmails?: string[];
  city: string;
  checkIn: string;
  checkOut: string;
  note?: string;
  hotelIds: string[];
  status: "draft" | "sent" | "viewed";
  createdAt: number;
  sentAt?: number;
  firstViewedAt?: number;
  viewCount: number;
}

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const rel = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const field =
  "w-full rounded-xl border border-[#DDDDDD] px-3 py-2 text-sm outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20";

export function OffersView() {
  // Builder state
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchHotel[]>([]);
  const [selected, setSelected] = useState<SearchHotel[]>([]);
  const [guestName, setGuestName] = useState("");
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // List state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (id: string) => `${origin}/offer/${id}`;

  const loadOffers = async () => {
    const d = await fetch("/api/offers").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d?.offers) setOffers(d.offers);
  };
  useEffect(() => {
    loadOffers();
  }, []);

  const runSearch = async () => {
    if (!city.trim() || !checkIn || !checkOut) {
      setError("Enter a city and both dates to search.");
      return;
    }
    setError(null);
    setSearching(true);
    try {
      const d = await fetch(
        `/api/offers/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}`,
      ).then((r) => r.json());
      setResults(d.hotels ?? []);
      if (!d.hotels?.length) setError(`No hotels found for ${city} on those dates.`);
    } catch {
      setError("Search failed — try again.");
    } finally {
      setSearching(false);
    }
  };

  const toggle = (h: SearchHotel) => {
    setSelected((cur) => {
      const has = cur.some((x) => x.sourceHotelId === h.sourceHotelId);
      if (has) return cur.filter((x) => x.sourceHotelId !== h.sourceHotelId);
      if (cur.length >= 3) return cur; // max 3
      return [...cur, h];
    });
  };
  const isSelected = (id: string) => selected.some((x) => x.sourceHotelId === id);

  const create = async () => {
    if (selected.length < 2) {
      setError("Pick 2 or 3 hotels to compare.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          checkIn,
          checkOut,
          guestName,
          guestEmails: emails,
          note,
          hotelIds: selected.map((s) => s.sourceHotelId),
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error || "Couldn't create the offer.");
        return;
      }
      setCreated(d.offer);
      loadOffers();
    } catch {
      setError("Couldn't create the offer — try again.");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
    } catch {
      /* ignore */
    }
  };

  const send = async (id: string) => {
    setSendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "POST" });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error || "Couldn't send — use Copy link instead.");
        return;
      }
      loadOffers();
      if (created?.id === id) setCreated({ ...created, status: "sent", sentAt: Date.now() });
    } catch {
      setError("Couldn't send — use Copy link instead.");
    } finally {
      setSendingId(null);
    }
  };

  const reset = () => {
    setCreated(null);
    setSelected([]);
    setResults([]);
    setGuestName("");
    setEmails("");
    setNote("");
    setCity("");
    setCheckIn("");
    setCheckOut("");
  };

  const canCreate = selected.length >= 2 && city && checkIn && checkOut;
  const statusBadge = (s: Offer["status"]) =>
    s === "viewed"
      ? "bg-[#FF385C] text-white"
      : s === "sent"
        ? "bg-[#FF385C]/10 text-[#FF385C]"
        : "bg-black/[0.06] text-[#717171]";

  const dateRange = useMemo(
    () => (checkIn && checkOut ? `${fmtDate(checkIn)} → ${fmtDate(checkOut)}` : ""),
    [checkIn, checkOut],
  );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        <p className="mt-1 text-sm text-[#717171]">
          Curate 2–3 hotels for a guest, then share a live, interactive comparison link.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-[#FF385C]/[0.08] px-3.5 py-2.5 text-sm text-[#c2334f]">{error}</p>
      )}

      {/* Created offer — success panel */}
      {created && (
        <div className="mt-6 rounded-2xl border border-[#FF385C]/30 bg-[#FF385C]/[0.04] p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
            <Sparkles className="size-4 text-[#FF385C]" /> Offer ready for {created.guestName || "your guest"}
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#EBEBEB] bg-white px-3 py-2">
            <Link2 className="size-4 shrink-0 text-[#717171]" />
            <span className="truncate text-sm text-[#333]">{linkFor(created.id)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => copy(created.id)} className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3.5 py-2 text-sm font-semibold hover:bg-black/[0.04]">
              {copiedId === created.id ? <Check className="size-4 text-[#FF385C]" /> : <Link2 className="size-4" />}
              {copiedId === created.id ? "Copied" : "Copy link"}
            </button>
            {created.guestEmails && created.guestEmails.length > 0 && (
              <button
                onClick={() => send(created.id)}
                disabled={sendingId === created.id || created.status !== "draft"}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FF385C] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {sendingId === created.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {created.status !== "draft"
                  ? "Emailed"
                  : `Email ${created.guestEmails.length} recipient${created.guestEmails.length > 1 ? "s" : ""}`}
              </button>
            )}
            <a href={linkFor(created.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#717171] hover:bg-black/[0.04]">
              <ExternalLink className="size-4" /> Preview
            </a>
            <button onClick={reset} className="ml-auto text-sm font-medium text-[#717171] hover:text-[#FF385C]">
              New offer
            </button>
          </div>
        </div>
      )}

      {/* Builder */}
      {!created && (
        <div className="mt-6 space-y-5">
          {/* 1. Search */}
          <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9a]">1 · Find hotels</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <input className={field} placeholder="City (e.g. Miami)" value={city} onChange={(e) => setCity(e.target.value)} />
              <input className={field} type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} aria-label="Check-in" />
              <input className={field} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-label="Check-out" />
              <button onClick={runSearch} disabled={searching} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {results.map((h) => (
                  <button
                    key={h.sourceHotelId}
                    onClick={() => toggle(h)}
                    disabled={!isSelected(h.sourceHotelId) && selected.length >= 3}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-40",
                      isSelected(h.sourceHotelId) ? "border-[#FF385C] bg-[#FF385C]/[0.05]" : "border-[#EBEBEB] hover:bg-[#f7f7f7]",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.image} alt="" className="size-12 shrink-0 rounded-lg object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#1a1a1a]">{h.name}</span>
                      <span className="block truncate text-xs text-[#717171]">
                        {[h.city, h.country].filter(Boolean).join(", ")}
                        {h.approxNightly ? ` · ~${formatCurrency(h.approxNightly, "USD")}/night est.` : ""}
                      </span>
                    </span>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", isSelected(h.sourceHotelId) ? "border-[#FF385C] bg-[#FF385C] text-white" : "border-black/20")}>
                      {isSelected(h.sourceHotelId) && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Selected + guest + note */}
          {selected.length > 0 && (
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9a]">
                2 · Personalise ({selected.length}/3 selected{dateRange ? ` · ${dateRange}` : ""})
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.map((s) => (
                  <span key={s.sourceHotelId} className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1 text-xs text-[#333]">
                    {s.name}
                    <button onClick={() => toggle(s)} className="text-[#9a9a9a] hover:text-[#FF385C]">✕</button>
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input className={field} placeholder="Guest first name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                <input className={field} placeholder="Email(s) — separate multiple with commas" value={emails} onChange={(e) => setEmails(e.target.value)} />
              </div>
              <textarea
                className={cn(field, "mt-3 min-h-24 resize-y")}
                placeholder="A personal note to the guest (e.g. 'Based on your beachfront + honeymoon note, here are my top 3…')"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                onClick={create}
                disabled={!canCreate || creating}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Create offer link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Offers list */}
      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9a]">Your offers</p>
        {offers.length === 0 ? (
          <p className="mt-3 text-sm text-[#717171]">No offers yet — create your first above.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {offers.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", statusBadge(o.status))}>{o.status}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                    {o.guestName || o.guestEmails?.[0] || "Guest"} · {o.city}
                  </p>
                  <p className="truncate text-xs text-[#717171]">
                    {fmtDate(o.checkIn)} → {fmtDate(o.checkOut)} · {o.hotelIds.length} hotels · {rel(o.createdAt)}
                    {o.viewCount > 0 && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[#FF385C]">
                        · <Eye className="size-3" /> {o.viewCount}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => copy(o.id)} title="Copy link" className="grid size-8 place-items-center rounded-full hover:bg-black/[0.05]">
                    {copiedId === o.id ? <Check className="size-4 text-[#FF385C]" /> : <Link2 className="size-4 text-[#555]" />}
                  </button>
                  {o.guestEmails && o.guestEmails.length > 0 && o.status === "draft" && (
                    <button onClick={() => send(o.id)} disabled={sendingId === o.id} title={`Email ${o.guestEmails.length} recipient(s)`} className="grid size-8 place-items-center rounded-full hover:bg-black/[0.05]">
                      {sendingId === o.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-[#555]" />}
                    </button>
                  )}
                  <a href={linkFor(o.id)} target="_blank" rel="noreferrer" title="Open" className="grid size-8 place-items-center rounded-full hover:bg-black/[0.05]">
                    <ExternalLink className="size-4 text-[#555]" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
