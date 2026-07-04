import { Fragment, type ReactNode } from "react";

/**
 * Tiny, dependency-free markdown renderer for advisor chat replies.
 * Supports what the advisor actually emits: **bold**, *italic*, `code`,
 * "- "/"* " bullet lists, "1." numbered lists, ### headings, simple pipe
 * tables, and paragraphs. Deliberately minimal and safe (no raw HTML).
 */

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on **bold**, *italic*, `code` while keeping delimiters.
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-[#1a1a1a]">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code key={`${keyBase}-c${i}`} className="rounded bg-black/[0.06] px-1 py-0.5 text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <em key={`${keyBase}-i${i}`} className="italic">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}
function isTableDivider(line: string): boolean {
  return /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(line) && line.includes("-");
}
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

export interface ChatImage {
  url: string;
  label: string;
}

/** A room the advisor can offer as a bookable card. */
export interface ChatBooking {
  url: string;
  label: string;
  image?: string;
  description?: string;
  nightly?: number;
  currency?: string;
}

/** A hotel the advisor can preview as a card with a link to its page. */
export interface ChatHotelCard {
  name: string;
  location?: string;
  blurb?: string;
  image?: string;
  url: string;
}

const money = (n?: number, currency = "USD") =>
  typeof n === "number" && n > 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
    : "";

export function ChatMarkdown({
  content,
  images,
  bookings,
  hotelCard,
}: {
  content: string;
  /** Resolves `[img:ID]` tags the advisor emits into real photos. */
  images?: Record<string, ChatImage>;
  /** Resolves `[book:ID]` tags into bookable room cards (prefilled booking form). */
  bookings?: Record<string, ChatBooking>;
  /** Resolves a `[hotel]` tag into a preview card of this property. */
  hotelCard?: ChatHotelCard;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(" ");
    blocks.push(
      <p key={`p${blocks.length}`} className="leading-[1.6]">
        {renderInline(text, `p${blocks.length}`)}
      </p>,
    );
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line → paragraph break
    if (!trimmed) {
      flushPara();
      i++;
      continue;
    }

    // Image tag: [img:ID] on its own line → render the real photo (skip if unknown)
    const imgTag = trimmed.match(/^\[img:([A-Za-z0-9_-]+)\]$/);
    if (imgTag) {
      flushPara();
      const img = images?.[imgTag[1]];
      if (img) {
        blocks.push(
          <figure key={`img${blocks.length}`} className="my-1 overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.label}
              loading="lazy"
              onError={(e) => {
                const fig = e.currentTarget.closest("figure");
                if (fig) (fig as HTMLElement).style.display = "none";
              }}
              className="block max-h-52 w-full object-cover"
            />
            <figcaption className="px-3 py-1.5 text-[11px] text-[#717171]">{img.label}</figcaption>
          </figure>,
        );
      }
      i++;
      continue;
    }

    // Booking tag: [book:ID] on its own line → a bookable ROOM CARD (skip if unknown)
    const bookTag = trimmed.match(/^\[book:([A-Za-z0-9_-]+)\]$/);
    if (bookTag) {
      flushPara();
      const bk = bookings?.[bookTag[1]];
      if (bk) {
        const price = money(bk.nightly, bk.currency);
        blocks.push(
          <div
            key={`book${blocks.length}`}
            className="my-1 overflow-hidden rounded-xl border border-black/[0.08] bg-white"
          >
            {bk.image && (
              <div className="relative h-28 w-full bg-black/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bk.image}
                  alt={bk.label}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="h-28 w-full object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-[#1a1a1a]">{bk.label}</p>
                {price && (
                  <p className="shrink-0 text-sm font-semibold text-[#1a1a1a]">
                    {price}
                    <span className="text-[11px] font-normal text-[#717171]"> / night</span>
                  </p>
                )}
              </div>
              {bk.description && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#717171]">{bk.description}</p>
              )}
              <a
                href={bk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Reserve →
              </a>
            </div>
          </div>,
        );
      }
      i++;
      continue;
    }

    // Hotel tag: [hotel] on its own line → a preview card of this property
    if (trimmed === "[hotel]") {
      flushPara();
      if (hotelCard) {
        blocks.push(
          <div
            key={`hotel${blocks.length}`}
            className="my-1 overflow-hidden rounded-xl border border-black/[0.08] bg-white"
          >
            {hotelCard.image && (
              <div className="relative h-28 w-full bg-black/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hotelCard.image}
                  alt={hotelCard.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="h-28 w-full object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <p className="font-semibold text-[#1a1a1a]">{hotelCard.name}</p>
              {hotelCard.location && <p className="text-xs text-[#717171]">{hotelCard.location}</p>}
              {hotelCard.blurb && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#717171]">{hotelCard.blurb}</p>
              )}
              <a
                href={hotelCard.url}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-black/[0.04]"
              >
                View hotel →
              </a>
            </div>
          </div>,
        );
      }
      i++;
      continue;
    }

    // Heading
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      blocks.push(
        <p key={`h${blocks.length}`} className="pt-0.5 text-[13px] font-semibold uppercase tracking-wide text-[#6a6a6a]">
          {renderInline(heading[2], `h${blocks.length}`)}
        </p>,
      );
      i++;
      continue;
    }

    // Table (header row + divider + body)
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushPara();
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`t${blocks.length}`} className="my-1 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-black/10">
                {header.map((c, ci) => (
                  <th key={ci} className="px-2 py-1.5 text-left font-semibold text-[#1a1a1a]">
                    {renderInline(c, `th${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-black/[0.06] last:border-0">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-2 py-1.5 align-top text-[#333]">
                      {renderInline(c, `td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul${blocks.length}`} className="space-y-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 leading-[1.55]">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary/60" />
              <span>{renderInline(it, `li${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol${blocks.length}`} className="space-y-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 leading-[1.55]">
              <span className="mt-px min-w-[1.1rem] shrink-0 text-[12px] font-semibold text-primary">{ii + 1}.</span>
              <span>{renderInline(it, `ol${ii}`)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Plain text → accumulate into paragraph
    para.push(trimmed);
    i++;
  }
  flushPara();

  return (
    <div className="space-y-2">
      {blocks.map((b, idx) => (
        <Fragment key={idx}>{b}</Fragment>
      ))}
    </div>
  );
}
