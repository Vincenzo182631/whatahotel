/**
 * Renders a schema.org JSON-LD block. Accepts one object or an array of them.
 * Server-safe; no client JS.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe inside a script tag; no user HTML is injected.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
