/**
 * The email block vocabulary, from design-reference/Starter Emails. An
 * email is a list of blocks, never hand-written HTML: that is what lets
 * Settings → Emails show the real thing and what keeps every send on the
 * same skeleton (brand row → card → footer).
 *
 * Text in a block is PLAIN — the renderer escapes it. `paragraph` is the
 * one exception and takes pre-built safe markup, so `strong()` below is
 * the only way to emphasise inside body copy.
 */

export type EmailBlock =
  | { type: "badge"; tone: "ok" | "warn" | "bad"; text: string }
  | { type: "heading"; text: string }
  /** Pre-escaped markup — build it with `esc()` / `strong()`. */
  | { type: "paragraph"; html: string }
  | { type: "code"; label: string; value: string }
  | { type: "button"; label: string; href: string }
  | { type: "fallback"; text: string; href?: string }
  | { type: "rows"; rows: readonly (readonly [string, string])[] }
  | { type: "callout"; title: string; body: string }
  | { type: "secondary"; text: string }

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Emphasis inside a paragraph. Escapes its input; returns safe markup. */
export function strong(s: string, color = "#0e1013"): string {
  return `<span class="e-ink" style="color:${color};font-weight:600;">${esc(s)}</span>`
}

/** Identifier for each block, for the "Blocks in this email" panel. */
export function blockNames(blocks: readonly EmailBlock[]): string[] {
  const names = blocks.map((b) => b.type)
  return ["brand", ...names, "footer"]
}
