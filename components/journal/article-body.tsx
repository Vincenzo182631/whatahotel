import Link from "next/link";
import type { ReactNode } from "react";
import type { Block } from "@/lib/journal/articles";

/** Parse lightweight inline formatting: [label](href) and **bold**. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <Link
          key={`${keyBase}-l${i}`}
          href={m[2]}
          className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
        >
          {m[1]}
        </Link>,
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-foreground">
          {m[3]}
        </strong>,
      );
    }
    last = regex.lastIndex;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[17px]">
      {blocks.map((block, i) => {
        if ("h2" in block) {
          return (
            <h2
              key={i}
              className="mt-12 mb-4 font-display text-2xl font-medium tracking-tight md:text-3xl"
            >
              {block.h2}
            </h2>
          );
        }
        if ("h3" in block) {
          return (
            <h3 key={i} className="mt-8 mb-2 font-display text-xl font-medium">
              {block.h3}
            </h3>
          );
        }
        if ("p" in block) {
          return (
            <p key={i} className="mt-4 leading-[1.8] text-foreground/80">
              {renderInline(block.p, `p${i}`)}
            </p>
          );
        }
        if ("ul" in block) {
          return (
            <ul key={i} className="mt-5 space-y-3">
              {block.ul.map((item, j) => (
                <li key={j} className="flex gap-3 leading-relaxed text-foreground/80">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(item, `p${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if ("quote" in block) {
          return (
            <blockquote
              key={i}
              className="my-10 border-l-2 border-primary/50 pl-6 font-display text-xl italic leading-relaxed text-foreground/85 md:text-2xl"
            >
              {renderInline(block.quote, `q${i}`)}
            </blockquote>
          );
        }
        return null;
      })}
    </div>
  );
}
