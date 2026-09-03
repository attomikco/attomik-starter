import { resolveCopy, type Locale } from "../i18n/index.ts"
import type { EmailBlock } from "./blocks.ts"
import { blockNames, esc, strong } from "./blocks.ts"
import type { EmailPalette } from "./palette.ts"
import { renderEmail, type EmailFooter } from "./render.ts"
import { renderText } from "./text.ts"

/**
 * The catalog of every email this product sends. Settings → Emails renders
 * this list; nothing else may build email HTML. Adding an email means
 * adding an entry here — it then appears on the screen automatically, with
 * no navigation or preview code to touch.
 *
 * `branding` is the honest part of each entry:
 *  - "workspace": sent from app code with the workspace's own accent,
 *    logo and default locale (the invitation).
 *  - "project": delivered by Supabase Auth from a static template pushed
 *    with `supabase config push`. There is no workspace context at sign-in
 *    time — the recipient may not belong to one — so these carry the
 *    PROJECT skin and locale, and `supabaseVars` holds the Go placeholders
 *    that the pushed file ships with.
 *
 * Pure module, relative .ts imports: scripts/build-auth-emails.ts renders
 * the same definitions into supabase/templates/, which is what makes the
 * preview and the real send the same bytes.
 */

export type EmailTemplateId = "magic_link" | "invitation"
export type EmailGroup = "authentication" | "membership"

export interface EmailContext {
  locale: Locale
  /** Workspace display name, or the project name for project-branded mail. */
  brandName: string
  logoUrl?: string | null
  palettes: { light: EmailPalette; dark: EmailPalette }
}

export interface BuiltEmail {
  subject: string
  preheader: string
  blocks: EmailBlock[]
  footer: EmailFooter
}

export interface EmailTemplateDefinition {
  id: EmailTemplateId
  group: EmailGroup
  delivery: "supabase" | "resend"
  branding: "project" | "workspace"
  /** [labelKey, valueKey] pairs; the Emails screen resolves both from copy. */
  meta: readonly (readonly [string, string])[]
  /** Readable stand-ins, used by the preview. */
  previewVars: Record<string, string>
  /** Go template placeholders, used when writing supabase/templates/. */
  supabaseVars?: Record<string, string>
  build(vars: Record<string, string>, ctx: EmailContext): BuiltEmail
}

/** Minutes a magic link stays valid — mirrors auth.email.otp_expiry (900s). */
export const MAGIC_LINK_TTL_MINUTES = 15

const magicLink: EmailTemplateDefinition = {
  id: "magic_link",
  group: "authentication",
  delivery: "supabase",
  branding: "project",
  meta: [
    ["trigger", "signInRequested"],
    ["delay", "immediate"],
    ["expiry", "magicLink"],
    ["delivery", "supabase"],
  ],
  previewVars: { url: "https://app.example.com/auth/callback?token=8f2c4471be0a" },
  supabaseVars: { url: "{{ .ConfirmationURL }}" },
  build(vars, ctx) {
    const c = resolveCopy(ctx.locale).email.magicLink
    return {
      subject: c.subject,
      preheader: c.preheader,
      blocks: [
        { type: "heading", text: c.title(ctx.brandName) },
        { type: "paragraph", html: esc(c.body) },
        { type: "button", label: c.action, href: vars.url },
        { type: "fallback", text: c.fallback, href: vars.url },
        { type: "callout", title: c.calloutTitle, body: c.calloutBody },
        { type: "secondary", text: c.secondary(MAGIC_LINK_TTL_MINUTES) },
      ],
      footer: { why: c.footer(ctx.brandName) },
    }
  },
}

const invitation: EmailTemplateDefinition = {
  id: "invitation",
  group: "membership",
  delivery: "resend",
  branding: "workspace",
  meta: [
    ["trigger", "invitationSent"],
    ["delay", "immediate"],
    ["expiry", "invitation"],
    ["delivery", "resend"],
  ],
  previewVars: {
    inviterEmail: "you@example.com",
    role: "Member",
    acceptUrl: "https://app.example.com/invite/2c9f14a7be03",
    expiresInDays: "7",
  },
  build(vars, ctx) {
    const copy = resolveCopy(ctx.locale)
    const c = copy.email.invitation
    const days = Number(vars.expiresInDays)
    return {
      subject: c.subject(vars.inviterEmail, ctx.brandName),
      preheader: c.preheader(vars.role, days),
      blocks: [
        { type: "heading", text: c.title(ctx.brandName) },
        { type: "paragraph", html: c.body(strong(vars.inviterEmail), strong(vars.role)) },
        { type: "button", label: c.accept, href: vars.acceptUrl },
        { type: "fallback", text: c.fallback, href: vars.acceptUrl },
        {
          type: "rows",
          rows: [
            [c.rows.workspace, ctx.brandName],
            [c.rows.role, vars.role],
            [c.rows.invitedBy, vars.inviterEmail],
          ],
        },
      ],
      footer: { why: c.footer(days, vars.inviterEmail, ctx.brandName) },
    }
  },
}

export const emailTemplates: readonly EmailTemplateDefinition[] = [magicLink, invitation]

export function emailTemplate(id: EmailTemplateId): EmailTemplateDefinition {
  const found = emailTemplates.find((t) => t.id === id)
  if (!found) throw new Error(`Unknown email template "${id}"`)
  return found
}

export interface RenderedEmail {
  subject: string
  preheader: string
  html: string
  text: string
  /** Block identifiers, for the "Blocks in this email" panel. */
  blocks: string[]
}

/**
 * A template rendered end to end. `forceMode` is preview-only (see
 * render.ts); sends omit it and ship light inline + a dark media query.
 */
export function renderTemplate(
  def: EmailTemplateDefinition,
  vars: Record<string, string>,
  ctx: EmailContext,
  forceMode?: "light" | "dark",
): RenderedEmail {
  const built = def.build(vars, ctx)
  return {
    subject: built.subject,
    preheader: built.preheader,
    blocks: blockNames(built.blocks),
    text: renderText(built.blocks, built.footer),
    html: renderEmail({
      lang: ctx.locale,
      palettes: ctx.palettes,
      brandName: ctx.brandName,
      logoUrl: ctx.logoUrl,
      preheader: built.preheader,
      blocks: built.blocks,
      footer: built.footer,
      forceMode,
    }),
  }
}
