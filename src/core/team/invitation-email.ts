/**
 * Workspace invitation email. Follows the reference email rules
 * (Starter Emails / README §6): one job, the workspace accent and logo
 * resolved to literal values at send time (mail clients strip custom
 * properties and oklch), neutral greys from the reference's hand-tuned
 * email palette, 620px single column,
 * a button with a plain-text URL fallback, and a footer that says why the
 * recipient got it. Pure module — no framework imports — so it stays
 * reusable and testable. Relative-import safe for node scripts.
 */

export interface InvitationEmailInput {
  workspaceName: string
  inviterEmail: string
  role: string
  acceptUrl: string
  expiresInDays: number
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
  const subject = `${inviterEmail} invited you to ${workspaceName}`

  const text = [
    `${inviterEmail} invited you to join ${workspaceName} as ${role}.`,
    "",
    `Accept the invitation: ${acceptUrl}`,
    "",
    `The link expires in ${expiresInDays} days and works once.`,
    "",
    `You received this because ${inviterEmail} invited this address to ${workspaceName}.`,
  ].join("\n")

  // Base-skin palette resolved to literal hex — the documented exception.
  const html = `<!doctype html>
<html>
<body style="margin:0;background:#e7e8eb;font-family:system-ui,-apple-system,sans-serif;color:#0e1013;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7e8eb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;padding:40px;">
        <tr><td style="padding-bottom:22px;">${
          logoUrl
            ? `<img src="${logoUrl}" alt="${escapeHtml(workspaceName)}" height="28" style="display:block;height:28px;max-width:180px;" />`
            : `<span style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7b8188;">${escapeHtml(workspaceName)}</span>`
        }</td></tr>
        <tr><td style="font-size:24px;font-weight:700;letter-spacing:-0.02em;padding-bottom:12px;">You're invited to ${escapeHtml(workspaceName)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#4c5158;padding-bottom:24px;">
          <span style="color:#0e1013;font-weight:600;">${escapeHtml(inviterEmail)}</span> invited you to join as
          <span style="color:#0e1013;font-weight:600;">${escapeHtml(role)}</span>.
          Accepting signs you in with a magic link — no password.
        </td></tr>
        <tr><td style="padding-bottom:22px;">
          <a href="${acceptUrl}" style="display:inline-block;background:${accent};color:${accentInk};font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;padding:13px 26px;">Accept invitation</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#7b8188;padding-bottom:22px;">
          If the button does not work, open this link:<br />
          <a href="${acceptUrl}" style="color:#4c5158;word-break:break-all;">${acceptUrl}</a>
        </td></tr>
        <tr><td style="border-top:1px solid #e0e2e5;padding-top:18px;font-size:12.5px;line-height:1.6;color:#a6abb1;">
          The link expires in ${expiresInDays} days and works once. You received this because
          ${escapeHtml(inviterEmail)} invited this address to ${escapeHtml(workspaceName)}.
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
