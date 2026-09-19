import { emailPalettes, emailTemplate, renderTemplate, type EmailBrandPair } from "../email/index.ts"
import type { Locale } from "../i18n/index.ts"
import { feedbackSnippet } from "./resolution.ts"

/**
 * "Feedback resolved" email. A thin adapter over the canonical email catalog
 * (`src/core/email`, template `feedback_resolved`) — same shape as the
 * invitation adapter, so Settings → Emails previews the exact bytes the
 * action hands to Resend. Words come from the shell dictionary in the
 * WORKSPACE's locale. Pure module, relative .ts imports.
 */

export interface FeedbackResolvedEmailInput {
  workspaceName: string
  /** The full feedback text as filed. */
  message: string
  /** Pre-formatted, e.g. "Ana García (ana@example.com)". */
  submittedBy: string
  /** Pre-formatted in the workspace's locale and time zone. */
  submittedAt: string
  resolvedBy: string
  note: string | null
  /** Absolute link to /settings/feedback. */
  feedbackUrl: string
  locale: Locale
  /** Workspace accent as LITERAL HEX (emailBrand); defaults to the base skin. */
  accent?: string
  accentInk?: string
  accentDark?: string
  accentInkDark?: string
  logoUrl?: string | null
}

export function feedbackResolvedEmail(input: FeedbackResolvedEmailInput): { subject: string; html: string; text: string } {
  const brand: Partial<EmailBrandPair> = {}
  if (input.accent) brand.light = { accent: input.accent, accentInk: input.accentInk ?? "#ffffff" }
  if (input.accentDark) brand.dark = { accent: input.accentDark, accentInk: input.accentInkDark ?? "#0d0f12" }

  const { subject, html, text } = renderTemplate(
    emailTemplate("feedback_resolved"),
    {
      snippet: feedbackSnippet(input.message),
      message: input.message,
      submittedBy: input.submittedBy,
      submittedAt: input.submittedAt,
      resolvedBy: input.resolvedBy,
      note: input.note ?? "",
      feedbackUrl: input.feedbackUrl,
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
