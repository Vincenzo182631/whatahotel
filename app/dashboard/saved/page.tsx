"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Scale, X } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { usePreferences } from "@/store/preferences-store";
import { useConversation } from "@/store/conversation-store";

interface MiniHotel {
  id: string;
  name: string;
  city: string;
  image: string;
  startingRate: number;
}

export default function SavedPage() {
  const router = useRouter();
  const saved = usePreferences((s) => s.saved);
  const recentlyViewed = usePreferences((s) => s.recentlyViewed);
  const toggleSave = usePreferences((s) => s.toggleSave);
  const send = useConversation((s) => s.send);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-3)));

  const compare = () => {
    if (selected.length < 2) return;
    send("Compare my saved hotels side by side.", { type: "compare", hotelIds: selected });
    router.push("/");
  };

  const Tile = ({ hotel, saveable }: { hotel: MiniHotel; saveable?: boolean }) => {
    const isSel = selected.includes(hotel.id);
    return (
      <div className="group overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white">
        <Link href={`/hotel/${hotel.id}`} className="relative block aspect-[4/3]">
          <ImageWithFallback src={hotel.image} seed={hotel.id} alt={hotel.name} fill sizes="300px" className="object-cover" />
        </Link>
        <div className="flex items-start justify-between gap-2 p-3">
          <div className="min-w-0">
            <Link href={`/hotel/${hotel.id}`} className="block truncate font-semibold hover:text-[#FF385C]">
              {hotel.name}
            </Link>
            <p className="truncate text-sm text-[#717171]">{hotel.city}</p>
            <p className="mt-0.5 text-sm text-[#717171]">Live rates for your dates</p>
          </div>
          {saveable && (
            <button
              onClick={() => toggleSave(hotel)}
              aria-label="Remove from saved"
              className="shrink-0 rounded-full p-1 text-[#717171] hover:bg-[#f7f7f7] hover:text-[#FF385C]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {saveable && (
          <label className="flex cursor-pointer items-center gap-2 border-t border-[#EBEBEB] px-3 py-2 text-xs font-medium text-[#717171]">
            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(hotel.id)} className="accent-[#FF385C]" />
            Select to compare
          </label>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Saved Hotels"
        subtitle="Your favourites and hotels you've viewed recently."
        action={
          <button
            onClick={compare}
            disabled={selected.length < 2}
            className="inline-flex items-center gap-2 rounded-full bg-[#FF385C] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Scale className="size-4" /> Compare{selected.length ? ` (${selected.length})` : ""}
          </button>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#717171]">
          Favourites
        </h2>
        {saved.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {saved.map((h) => <Tile key={h.id} hotel={h} saveable />)}
          </div>
        ) : (
          <Card className="flex items-center gap-3 text-sm text-[#717171]">
            <Heart className="size-5 text-[#FF385C]" />
            You haven't saved any hotels yet.{" "}
            <Link href="/" className="font-semibold text-[#FF385C] hover:underline">Browse hotels →</Link>
          </Card>
        )}
      </section>

      {recentlyViewed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#717171]">
            Recently viewed
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.map((h) => <Tile key={h.id} hotel={h} />)}
          </div>
        </section>
      )}
    </>
  );
}
