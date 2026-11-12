import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, Check, MapPin, Sparkles, Star, Trophy, UtensilsCrossed, X } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, comparisonSchema, faqSchema, SITE_URL } from "@/lib/seo/schema";
import {
  AMENITY_LABEL,
  buildVerdict,
  cityLabel,
  comparisonPath,
  hotelHref,
  parseComparisonSlug,
  relatedPairs,
  type Side,
} from "@/lib/seo/comparisons";
import { getHotelInfo, getLiveHotel } from "@/lib/services/live-rates";
import { cn } from "@/lib/utils";
import type { Hotel } from "@/lib/services/types";

const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

// Live hotel info (dining, amenities, nearby, coordinates) is fetched per
// request, like the hotel pages; the catalogue facts render even without it.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { params: Promise<{ slug: string }> };

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function describe(a: Hotel, b: Hotel): string {
  return `${a.name} vs ${b.name}: compare these ${cityLabel(a)} hotels side by side — luxury pedigree, exclusive perks, dining, facilities and value — with our advisor's verdict on which to book.`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const pair = parseComparisonSlug(slug);
  if (!pair) return { title: "Hotel comparison — WhataHotel" };
  const { a, b } = pair;
  const path = comparisonPath(a.id, b.id);
  const title = `${a.name} vs ${b.name}: Which Is Better? | WhataHotel`;
  const description = describe(a, b);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: "article",
      images: [a.image, b.image].filter(Boolean),
    },
  };
}

async function loadSide(h: Hotel): Promise<Side> {
  const info = await getHotelInfo(h.name, h.city).catch(() => null);
  return { hotel: h, info };
}

export default async function HotelVsPage({ params }: Params) {
  const { slug } = await params;
  const pair = parseComparisonSlug(slug);
  if (!pair) notFound();

  // One canonical URL per pair, whichever order it was typed in.
  const canonical = comparisonPath(pair.a.id, pair.b.id);
  if (`/compare/${slug}` !== canonical) permanentRedirect(canonical);
  const { a, b } = pair;

  // Info for both, then coordinates (the source throttles bursts, so 2 at a time).
  const [A, B] = await Promise.all([loadSide(a), loadSide(b)]);
  const [la, lb] = await Promise.all([
    a.sourceHotelId ? getLiveHotel(a.sourceHotelId).catch(() => null) : null,
    b.sourceHotelId ? getLiveHotel(b.sourceHotelId).catch(() => null) : null,
  ]);
  A.coordinates = la?.coordinates;
  B.coordinates = lb?.coordinates;

  const v = buildVerdict(A, B);
  const city = cityLabel(a);
  const sameCity = a.destinationKey === b.destinationKey;
  const winner = v.pick === "a" ? a : v.pick === "b" ? b : null;
  const liveCompare = `/compare?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`;
  const related = [...relatedPairs(a, 3, b.id), ...relatedPairs(b, 3, a.id)].filter(
    (p, i, all) => p.path !== canonical && all.findIndex((q) => q.path === p.path) === i,
  );

  const allRows: { label: string; show?: (s: Side) => boolean; cell: (s: Side) => React.ReactNode }[] = [
    { label: "Brand", cell: (s) => s.hotel.brand || "Independent" },
    {
      label: "Star rating",
      cell: (s) =>
        s.hotel.starRating > 0 ? (
          <span className="inline-flex">
            {Array.from({ length: s.hotel.starRating }).map((_, i) => (
              <Star key={i} className="size-3.5 fill-[#FF385C] text-[#FF385C]" strokeWidth={1.5} />
            ))}
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "Typical starting rate",
      cell: (s) => (s.hotel.startingRate > 0 ? `from ${money(s.hotel.startingRate)} / night` : "On request"),
    },
    {
      label: "Exclusive perks",
      cell: (s) =>
        s.hotel.perks.length ? (
          <ul className="space-y-1">
            {s.hotel.perks.slice(0, 4).map((p) => (
              <li key={p.id} className="flex gap-1.5">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-[#FF385C]" strokeWidth={1.5} />
                {p.label.replace(/\*+$/, "")}
              </li>
            ))}
          </ul>
        ) : (
          "—"
        ),
    },
    {
      label: "On-site dining",
      show: (s) => Boolean(s.info?.restaurants.length),
      cell: (s) =>
        s.info?.restaurants.length ? (
          <ul className="space-y-1">
            {s.info.restaurants.slice(0, 5).map((r) => (
              <li key={r} className="flex gap-1.5">
                <UtensilsCrossed className="mt-0.5 size-3 shrink-0 text-[#FF385C]/80" strokeWidth={1.5} />
                {r}
              </li>
            ))}
          </ul>
        ) : (
          "—"
        ),
    },
    {
      label: "Nearby",
      show: (s) => Boolean(s.info?.attractions.length),
      cell: (s) => (s.info?.attractions.length ? s.info.attractions.slice(0, 4).join(" · ") : "—"),
    },
  ];
  // Hide a row when neither hotel has data for it — no padding with blanks.
  const rows = allRows.filter((r) => !r.show || r.show(A) || r.show(B));
  const tiedOn = list(v.categories.filter((c) => c.winner === "tie").map((c) => c.label.toLowerCase()));
  const allAmenities = [...new Set([...v.amenitiesA, ...v.amenitiesB])];

  return (
    <div className="min-h-dvh bg-white text-[#222]">
      <JsonLd
        data={[
          comparisonSchema({ path: canonical, name: `${a.name} vs ${b.name}`, description: describe(a, b), hotels: [a, b] }),
          faqSchema(v.faqs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            ...(sameCity ? [{ name: `Hotels in ${city}`, path: `/city/${a.destinationKey}` }] : []),
            { name: `${a.name} vs ${b.name}`, path: canonical },
          ]),
        ]}
      />

      <header className="sticky top-0 z-30 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="What a Hotel — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="What a Hotel" className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <nav aria-label="Breadcrumb" className="text-xs text-[#717171]">
          <Link href="/" className="hover:underline">Home</Link>
          {sameCity && (
            <>
              <span className="mx-1.5">›</span>
              <Link href={`/city/${a.destinationKey}`} className="hover:underline">Hotels in {city}</Link>
            </>
          )}
          <span className="mx-1.5">›</span>
          <span className="text-[#222]">Comparison</span>
        </nav>

        <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
          {a.name} <span className="text-[#FF385C]">vs</span> {b.name}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#717171]">
          <MapPin className="size-4 text-[#FF385C]" /> {sameCity ? city : `${cityLabel(a)} vs ${cityLabel(b)}`}
          {v.distanceKm != null && ` · about ${v.distanceKm < 1 ? `${Math.round(v.distanceKm * 1000)} m` : `${v.distanceKm} km`} apart`}
        </p>

        {/* The two hotels */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[A, B].map((s) => (
            <Link key={s.hotel.id} href={hotelHref(s.hotel)} className="group overflow-hidden rounded-2xl border border-[#EBEBEB]">
              <div className="relative aspect-[16/10] bg-[#eee]">
                <ImageWithFallback
                  src={s.hotel.image}
                  seed={s.hotel.id}
                  alt={s.hotel.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 550px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {winner?.id === s.hotel.id && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#FF385C] px-2.5 py-1 text-xs font-semibold text-white">
                    <Trophy className="size-3.5" /> Advisor&apos;s pick
                  </span>
                )}
              </div>
              <div className="p-4">
                {s.hotel.brand && <p className="text-[10px] font-medium uppercase tracking-wider text-[#FF385C]">{s.hotel.brand}</p>}
                <p className="font-semibold leading-tight">{s.hotel.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[#717171]">
                  {s.info?.description || s.hotel.shortPitch}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Verdict */}
        <section className="mt-8 rounded-2xl border border-[#FF385C]/25 bg-[#FF385C]/[0.05] p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-[#FF385C]" /> Which is better?
          </h2>
          <p className="mt-2 leading-relaxed text-[#333]">{v.summary}</p>
          {(v.chooseA.length > 0 || v.chooseB.length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {([[a, v.chooseA], [b, v.chooseB]] as const).map(([h, reasons]) => (
                <div key={h.id}>
                  <p className="text-sm font-semibold">Choose {h.name} for</p>
                  {reasons.length ? (
                    <ul className="mt-1.5 space-y-1.5">
                      {reasons.map((r) => (
                        <li key={r} className="flex gap-1.5 text-sm text-[#444]">
                          <Check className="mt-0.5 size-4 shrink-0 text-[#FF385C]" /> {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-sm text-[#717171]">
                      {tiedOn ? `It matches its rival on ${tiedOn} — pick it if you prefer its ${h.brand ? `${h.brand} ` : ""}style and setting.` : `Pick it if you prefer its ${h.brand ? `${h.brand} ` : ""}style and setting.`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={liveCompare} className="inline-flex items-center gap-1 rounded-full bg-[#FF385C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Compare live rates for your dates <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </section>

        {/* Head-to-head */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Head-to-head</h2>
          <ul className="mt-3 divide-y divide-[#EBEBEB] rounded-2xl border border-[#EBEBEB]">
            {v.categories.map((c) => (
              <li key={c.label} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:gap-4">
                <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-[#717171]">{c.label}</span>
                <span className="flex-1 text-sm text-[#333]">
                  <span className="mr-2 inline-block rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold">
                    {c.winner === "tie" ? "Tie" : `${c.winner === "a" ? a.name : b.name}`}
                  </span>
                  {c.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Side-by-side table */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Side by side</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[#EBEBEB]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-[#fafafa]">
                  <th className="w-40 p-3" />
                  <th className="p-3 font-semibold">{a.name}</th>
                  <th className="p-3 font-semibold">{b.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-[#EBEBEB] align-top last:border-0">
                    <th scope="row" className="p-3 text-xs font-semibold uppercase tracking-wide text-[#717171]">{r.label}</th>
                    <td className="p-3 text-[#333]">{r.cell(A)}</td>
                    <td className="p-3 text-[#333]">{r.cell(B)}</td>
                  </tr>
                ))}
                {allAmenities.map((k) => (
                  <tr key={k} className="border-b border-[#EBEBEB] last:border-0">
                    <th scope="row" className="p-3 text-xs font-semibold uppercase tracking-wide text-[#717171]">{AMENITY_LABEL[k]}</th>
                    {[v.amenitiesA, v.amenitiesB].map((have, i) => (
                      <td key={i} className="p-3">
                        {have.includes(k) ? (
                          <Check className="size-4 text-[#FF385C]" aria-label="Yes" />
                        ) : (
                          <X className="size-4 text-[#c4c4c4]" aria-label="Not listed" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#9a9a9a]">
            Starting rates are indicative; live prices vary by date. Facilities are those listed by each hotel.
          </p>
        </section>

        {/* FAQ — mirrors the FAQPage structured data */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Frequently asked</h2>
          <div className="mt-3 divide-y divide-[#EBEBEB] rounded-2xl border border-[#EBEBEB]">
            {v.faqs.map((f) => (
              <details key={f.q} className="group p-4" open>
                <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-[#555]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related comparisons — internal links */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">More {sameCity ? city : ""} hotel comparisons</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.path}>
                  <Link href={p.path} className={cn("block rounded-xl border border-[#EBEBEB] px-4 py-3 text-sm hover:border-[#FF385C]/40")}>
                    {p.a.name} <span className="text-[#FF385C]">vs</span> {p.b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
