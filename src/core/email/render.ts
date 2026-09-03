import type { EmailBlock } from "./blocks.ts"
import { esc } from "./blocks.ts"
import type { EmailPalette } from "./palette.ts"

/**
 * The one email renderer. Every email the product sends is a block list
 * passed through here, so Settings → Emails previews the same bytes the
 * recipient gets — there is no second template language and no per-module
 * email HTML anywhere in the codebase.
 *
 * Constraints this file exists to hold in one place:
 *  - Table layout, 620px single column, inline styles: mail clients have
 *    no flexbox, no grid, and strip <style> in several major readers.
 *  - Literal hex only (see palette.ts).
 *  - Dark mode is a `prefers-color-scheme` override block with
 *    !important, because inline styles otherwise always win. Clients that
 *    ignore it (Gmail web, Outlook desktop) simply render the light
 *    palette, which is why light is the inline one.
 *  - A button always ships with the same URL as plain text underneath.
 *
 * `forceMode` is a PREVIEW-ONLY flag: it inlines one palette and drops the
 * media query so the Emails screen can show either theme regardless of the
 * reviewer's OS. Sends never pass it.
 */

export interface EmailFooter {
  /** Why this address received the email. Required on every send. */
  why: string
  /** Sender identity line (from address, or the workspace name). */
  meta?: string
  links?: string
}

export interface RenderEmailInput {
  lang: string
  palettes: { light: EmailPalette; dark: EmailPalette }
  brandName: string
  /** Light-ground logo; emails render on the light card by default. */
  logoUrl?: string | null
  preheader: string
  blocks: readonly EmailBlock[]
  footer: EmailFooter
  forceMode?: "light" | "dark"
}

export function renderEmail(input: RenderEmailInput): string {
  const dark = input.forceMode === "dark"
  const p = dark ? input.palettes.dark : input.palettes.light
  const d = input.palettes.dark
  const media = input.forceMode ? "" : darkOverrides(d)

  const body = input.blocks.map((b) => renderBlock(b, p)).join("\n")

  return `<!doctype html>
<html lang="${esc(input.lang)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${esc(input.preheader)}</title>
<style>
  a { text-decoration: none; }
  @media only screen and (max-width: 620px) {
    .e-card { padding: 26px 22px !important; border-radius: 12px !important; }
    .e-heading { font-size: 21px !important; }
  }
${media}</style>
</head>
<body class="e-ground" style="margin:0;padding:0;background:${p.ground};font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:${p.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="e-ground" style="background:${p.ground};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" class="e-card" style="max-width:620px;width:100%;background:${p.card};border-radius:16px;padding:40px;">
<tr><td style="padding-bottom:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="left" style="vertical-align:middle;">${brandMark(input, p)}</td>
    <td align="right" class="e-meta" style="vertical-align:middle;font-size:11.5px;color:${p.meta};padding-left:16px;">${esc(input.preheader)}</td>
  </tr></table>
</td></tr>
${body}
<tr><td class="e-hair" style="border-top:1px solid ${p.line};padding-top:20px;">
  <div class="e-meta" style="font-size:12.5px;line-height:1.6;color:${p.meta};">${esc(input.footer.why)}</div>
  ${input.footer.meta ? `<div class="e-meta" style="font-size:12.5px;line-height:1.6;color:${p.meta};padding-top:4px;">${esc(input.footer.meta)}</div>` : ""}
  ${input.footer.links ? `<div class="e-meta" style="font-size:12.5px;line-height:1.6;color:${p.meta};padding-top:4px;">${esc(input.footer.links)}</div>` : ""}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function brandMark(input: RenderEmailInput, p: EmailPalette): string {
  if (input.logoUrl) {
    return `<img src="${esc(input.logoUrl)}" alt="${esc(input.brandName)}" height="28" style="display:block;height:28px;max-width:180px;border:0;" />`
  }
  return `<span class="e-meta" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${p.meta};">${esc(input.brandName)}</span>`
}

function renderBlock(block: EmailBlock, p: EmailPalette): string {
  const cell = (inner: string, pad = "0 0 18px") => `<tr><td style="padding:${pad};">${inner}</td></tr>`

  switch (block.type) {
    case "badge": {
      const [fg, bg, cls] =
        block.tone === "ok" ? [p.ok, p.okTint, "e-badge-ok"]
        : block.tone === "bad" ? [p.bad, p.badTint, "e-badge-bad"]
        : [p.warn, p.warnTint, "e-badge-warn"]
      return cell(
        `<span class="${cls}" style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:${fg};background:${bg};border-radius:999px;padding:5px 11px;">${esc(block.text)}</span>`,
        "0 0 14px",
      )
    }
    case "heading":
      return cell(
        `<div class="e-heading e-ink" style="font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;color:${p.ink};">${esc(block.text)}</div>`,
        "0 0 12px",
      )
    case "paragraph":
      return cell(
        `<div class="e-ink2" style="font-size:15px;line-height:1.6;color:${p.ink2};">${block.html}</div>`,
        "0 0 22px",
      )
    case "code":
      return cell(
        `<div class="e-inset" style="background:${p.inset};border:1px solid ${p.line};border-radius:12px;padding:18px 20px;text-align:center;">
          <div class="e-meta" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;color:${p.meta};padding-bottom:8px;">${esc(block.label)}</div>
          <div class="e-ink" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;font-weight:600;letter-spacing:.14em;color:${p.ink};">${esc(block.value)}</div>
        </div>`,
        "0 0 22px",
      )
    case "button":
      return cell(
        `<a href="${block.href}" class="e-btn" style="display:inline-block;background:${p.accent};color:${p.accentInk};font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;padding:13px 26px;">${esc(block.label)}</a>`,
        "4px 0 18px",
      )
    case "fallback":
      return cell(
        `<div class="e-meta" style="font-size:13px;line-height:1.6;color:${p.meta};">${esc(block.text)}${
          block.href ? `<br /><a href="${block.href}" class="e-link" style="color:${p.ink2};word-break:break-all;">${esc(block.href)}</a>` : ""
        }</div>`,
        "0 0 22px",
      )
    case "rows":
      return cell(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="e-inset" style="background:${p.inset};border:1px solid ${p.line};border-radius:12px;">
          ${block.rows
            .map(
              ([left, right], i) =>
                `<tr><td class="${i > 0 ? "e-hair" : ""}" style="font-size:13.5px;color:${p.ink2};padding:11px 18px;${i > 0 ? `border-top:1px solid ${p.line};` : ""}">${esc(left)}</td>` +
                `<td align="right" class="e-ink ${i > 0 ? "e-hair" : ""}" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:${p.ink};padding:11px 18px;${i > 0 ? `border-top:1px solid ${p.line};` : ""}">${esc(right)}</td></tr>`,
            )
            .join("")}
        </table>`,
        "0 0 22px",
      )
    case "callout":
      return cell(
        `<div class="e-inset" style="background:${p.inset};border:1px solid ${p.line};border-radius:12px;padding:16px 18px;">
          <div class="e-ink" style="font-size:13.5px;font-weight:600;color:${p.ink};padding-bottom:5px;">${esc(block.title)}</div>
          <div class="e-ink2" style="font-size:13.5px;line-height:1.55;color:${p.ink2};">${esc(block.body)}</div>
        </div>`,
        "0 0 22px",
      )
    case "secondary":
      return cell(
        `<div class="e-meta" style="font-size:13px;line-height:1.6;color:${p.meta};">${esc(block.text)}</div>`,
        "0 0 22px",
      )
  }
}

/**
 * Dark palette as a prefers-color-scheme override. !important is required:
 * every value above is inline, and inline beats a class selector.
 */
function darkOverrides(d: EmailPalette): string {
  return `  @media (prefers-color-scheme: dark) {
    body, .e-ground { background: ${d.ground} !important; }
    .e-card { background: ${d.card} !important; }
    .e-inset { background: ${d.inset} !important; border-color: ${d.line} !important; }
    .e-hair { border-color: ${d.line} !important; }
    .e-ink { color: ${d.ink} !important; }
    .e-heading { color: ${d.ink} !important; }
    .e-ink2 { color: ${d.ink2} !important; }
    .e-meta { color: ${d.meta} !important; }
    .e-link { color: ${d.ink2} !important; }
    .e-btn { background: ${d.accent} !important; color: ${d.accentInk} !important; }
    .e-badge-ok { color: ${d.ok} !important; background: ${d.okTint} !important; }
    .e-badge-warn { color: ${d.warn} !important; background: ${d.warnTint} !important; }
    .e-badge-bad { color: ${d.bad} !important; background: ${d.badTint} !important; }
  }
`
}
