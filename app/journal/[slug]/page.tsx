import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { ArticleBody } from "@/components/journal/article-body";
import { TravelEssentials } from "@/components/journal/travel-essentials";
import { Button } from "@/components/ui/button";
import {
  ARTICLES,
  getArticle,
  getRelatedArticles,
} from "@/lib/journal/articles";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return { title: "Article not found — WhataHotel Journal" };
  return {
    title: a.metaTitle,
    description: a.metaDescription,
    keywords: a.keywords,
    openGraph: {
      title: a.metaTitle,
      description: a.metaDescription,
      type: "article",
      publishedTime: a.date,
      authors: [a.author],
      images: [{ url: a.image }],
    },
    twitter: {
      card: "summary_large_image",
      title: a.metaTitle,
      description: a.metaDescription,
      images: [a.image],
    },
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.metaDescription,
    image: article.image,
    datePublished: article.date,
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: "WhataHotel",
    },
    keywords: article.keywords.join(", "),
  };

  return (
    <main className="min-h-dvh">
      <SiteHeader />

      <article className="container pb-16 pt-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 text-sm text-foreground/72 transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} /> The Journal
          </Link>

          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-primary/80">
            {article.category}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-[1.1] tracking-tight md:text-5xl">
            {article.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/55">
            <span>By {article.author}</span>
            <span aria-hidden>·</span>
            <span>{fmtDate(article.date)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={1.5} /> {article.readMinutes} min read
            </span>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative mx-auto mt-8 h-[280px] max-w-4xl overflow-hidden rounded-3xl md:h-[440px]">
          <ImageWithFallback
            src={article.image}
            seed={article.slug}
            alt={article.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
          />
        </div>

        {/* Body */}
        <div className="mx-auto mt-10 max-w-3xl">
          <p className="font-display text-xl leading-relaxed text-foreground/90 md:text-2xl">
            {article.intro}
          </p>

          <ArticleBody blocks={article.body} />

          <TravelEssentials
            intro={article.essentials.intro}
            products={article.essentials.products}
          />

          {/* Advisor CTA */}
          <div className="my-12 flex flex-col items-start gap-4 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-7 ring-1 ring-primary/15 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-medium">
                <Sparkles className="size-5 text-primary" strokeWidth={1.5} /> Ready to plan it?
              </h2>
              <p className="mt-1.5 text-foreground/75">
                Tell our AI advisor what you have in mind — it does the rest.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/">Start the conversation</Link>
            </Button>
          </div>

          {/* Related */}
          <div className="mt-12 border-t border-black/[0.06] pt-8">
            <h2 className="font-display text-2xl font-medium">Keep reading</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/journal/${r.slug}`}
                  className="group rounded-2xl border border-black/[0.06] bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <span className="text-[11px] uppercase tracking-wider text-primary/80">
                    {r.category}
                  </span>
                  <h3 className="mt-2 font-display text-base font-medium leading-snug">
                    {r.title}
                  </h3>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
                    Read
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </article>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
