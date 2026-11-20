const EM = "\u2014";
const EN = "–";

/**
 * House style: no em dashes in anything a guest reads. The advisor prompts already
 * forbid them, but a model can still slip one in, so advisor text passes through here
 * before it renders.
 *
 * - A dash standing alone (an empty value or table cell) becomes an en dash.
 * - A dash opening a line becomes a "- " bullet.
 * - A dash next to other punctuation is dropped.
 * - Any other dash becomes a comma.
 */
export function noEmDash(text: string): string {
  if (!text || !text.includes(EM)) return text;
  return text
    .replace(/^([ \t]*)\u2014[ \t]*$/gm, `$1${EN}`)
    .replace(/\|[ \t]*\u2014[ \t]*(?=\|)/g, `| ${EN} `)
    .replace(/^([ \t]*)\u2014[ \t]*(?=\S)/gm, "$1- ")
    .replace(/[ \t]*\u2014[ \t]*([.,;:!?)])/g, "$1")
    .replace(/([,;:(])[ \t]*\u2014[ \t]*/g, "$1 ")
    .replace(/[ \t]*\u2014[ \t]*/g, ", ");
}
