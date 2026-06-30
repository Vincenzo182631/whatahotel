import { ShoppingBag, ExternalLink } from "lucide-react";
import { amazonLink, type Product } from "@/lib/journal/articles";

export function TravelEssentials({
  intro,
  products,
}: {
  intro: string;
  products: Product[];
}) {
  return (
    <section className="my-12 overflow-hidden rounded-3xl border border-primary/15 bg-secondary/60 p-6 md:p-8">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShoppingBag className="size-4" strokeWidth={1.5} />
        </span>
        <h2 className="font-display text-2xl font-medium">Travel Essentials</h2>
      </div>
      <p className="mt-3 max-w-2xl text-foreground/75">{intro}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <a
            key={p.name}
            href={amazonLink(p.query)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex flex-col rounded-2xl border border-black/[0.06] bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <h3 className="font-display text-lg font-medium leading-snug">{p.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/70">
              {p.blurb}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Shop on Amazon
              <ExternalLink className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </span>
          </a>
        ))}
      </div>

      <p className="mt-5 text-xs text-foreground/55">
        Links open Amazon search results. As an Amazon Associate, WhataHotel may earn
        from qualifying purchases.
      </p>
    </section>
  );
}
