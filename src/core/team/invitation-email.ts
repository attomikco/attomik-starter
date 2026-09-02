import { resolveCopy, type Locale } from "../i18n/index.ts"

/**
 * Workspace invitation email. Follows the reference email rules
 * (Starter Emails / README §6): one job, the workspace accent and logo
 * resolved to literal values at send time (mail clients strip custom
 * properties and oklch), neutral greys from the reference's hand-tuned
 * email palette, 620px single column, a button with a plain-text URL
 * fallback, and a footer that says why the recipient got it. Words come
 * from the shell dictionary in the WORKSPACE's locale — the recipient has
 * no profile yet. Pure module — no framework imports — so it stays
 * reusable and testable. Relative-import safe for node scripts.
 */

export interface InvitationEmailInput {
  workspaceName: string
  inviterEmail: string
  /** The on-screen role name in the email's locale (never the identifier). */
  role: string
  acceptUrl: string
  expiresInDays: number
  /** Workspace default locale; the recipient has no preference yet. */
  locale: Locale
  /** Workspace accent as LITERAL HEX (emailBrand); defaults to the base skin. */
  accent?: string
  accentInk?: string
  /** Light-ground workspace logo (emails render on the light card). */
  logoUrl?: string | null
}

export function invitationEmail(input: InvitationEmailInput): {
  subject: string
  html: string
  text: string
} {
  const { workspaceName, inviterEmail, role, acceptUrl, expiresInDays, logoUrl } = input
  const accent = input.accent ?? "#2f4fd0"
  const accentInk = input.accentInk ?? "#ffffff"
  const c = resolveCopy(input.locale).email.invitation
  const subject = c.subject(inviterEmail, workspaceName)

  const text = [
    c.textIntro(inviterEmail, workspaceName, role),
    "",
    c.textAccept(acceptUrl),
    "",
    c.footer(expiresInDays, inviterEmail, workspaceName),
  ].join("\n")

  const strong = (s: string) => `<span style="color:#0e1013;font-weight:600;">${escapeHtml(s)}</span>`

  // Base-skin palette resolved to literal hex — the documented exception.
  const html = `<!doctype html>
<html lang="${input.locale}">
<body style="margin:0;background:#e7e8eb;font-family:system-ui,-apple-system,sans-serif;color:#0e1013;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7e8eb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;padding:40px;">
        <tr><td style="padding-bottom:22px;">${
          logoUrl
            ? `<img src="${logoUrl}" alt="${escapeHtml(workspaceName)}" height="28" style="display:block;height:28px;max-width:180px;" />`
            : `<span style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7b8188;">${escapeHtml(workspaceName)}</span>`
        }</td></tr>
        <tr><td style="font-size:24px;font-weight:700;letter-spacing:-0.02em;padding-bottom:12px;">${escapeHtml(c.title(workspaceName))}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#4c5158;padding-bottom:24px;">
          ${c.body(strong(inviterEmail), strong(role))}
        </td></tr>
        <tr><td style="padding-bottom:22px;">
          <a href="${acceptUrl}" style="display:inline-block;background:${accent};color:${accentInk};font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;padding:13px 26px;">${escapeHtml(c.accept)}</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#7b8188;padding-bottom:22px;">
          ${escapeHtml(c.fallback)}<br />
          <a href="${acceptUrl}" style="color:#4c5158;word-break:break-all;">${acceptUrl}</a>
        </td></tr>
        <tr><td style="border-top:1px solid #e0e2e5;padding-top:18px;font-size:12.5px;line-height:1.6;color:#a6abb1;">
          ${c.footer(expiresInDays, escapeHtml(inviterEmail), escapeHtml(workspaceName))}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
