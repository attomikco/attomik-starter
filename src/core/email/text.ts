import type { EmailBlock } from "./blocks.ts"
import type { EmailFooter } from "./render.ts"

/**
 * The plain-text part, derived from the SAME block list as the HTML so the
 * two can never drift. Every send ships both: a text/plain alternative is
 * what accessibility readers, plain-text clients, and spam scoring read.
 */
export function renderText(blocks: readonly EmailBlock[], footer: EmailFooter): string {
  const out: string[] = []

  for (const b of blocks) {
    switch (b.type) {
      case "badge": out.push(b.text.toUpperCase()); break
      case "heading": out.push(b.text); break
      case "paragraph": out.push(stripTags(b.html)); break
      case "code": out.push(`${b.label}: ${b.value}`); break
      case "button": out.push(`${b.label}: ${b.href}`); break
      case "fallback": out.push(b.href ? `${b.text} ${b.href}` : b.text); break
      case "rows": out.push(b.rows.map(([l, r]) => `${l}: ${r}`).join("\n")); break
      case "callout": out.push(`${b.title}\n${b.body}`); break
      case "secondary": out.push(b.text); break
    }
  }

  out.push([footer.why, footer.meta, footer.links].filter(Boolean).join("\n"))
  return out.join("\n\n")
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .trim()
}
