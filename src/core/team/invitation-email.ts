import { emailPalettes, emailTemplate, renderTemplate, type EmailBrandPair } from "../email/index.ts"
import type { Locale } from "../i18n/index.ts"

/**
 * Workspace invitation email. A thin adapter over the canonical email
 * catalog (`src/core/email`) — the template, the blocks, the palettes and
 * the plain-text part all live there, which is what lets Settings → Emails
 * preview the exact bytes this function hands to Resend.
 *
 * Words come from the shell dictionary in the WORKSPACE's locale: the
 * recipient has no profile yet. Pure module, relative .ts imports, so it
 * stays runnable from node scripts and tests.
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
  /** Dark-theme accent pair, for the prefers-color-scheme block. */
  accentDark?: string
  accentInkDark?: string
  /** Light-ground workspace logo (emails inline the light card). */
  logoUrl?: string | null
}

export function invitationEmail(input: InvitationEmailInput): {
  subject: string
  html: string
  text: string
} {
  const brand: Partial<EmailBrandPair> = {}
  if (input.accent) brand.light = { accent: input.accent, accentInk: input.accentInk ?? "#ffffff" }
  if (input.accentDark) brand.dark = { accent: input.accentDark, accentInk: input.accentInkDark ?? "#0d0f12" }

  const { subject, html, text } = renderTemplate(
    emailTemplate("invitation"),
    {
      inviterEmail: input.inviterEmail,
      role: input.role,
      acceptUrl: input.acceptUrl,
      expiresInDays: String(input.expiresInDays),
    },
    {
      locale: input.locale,
      brandName: input.workspaceName,
      logoUrl: input.logoUrl,
      palettes: emailPalettes(brand),
    },
  )

  return { subject, html, text }
}
