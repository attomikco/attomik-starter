"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { recordActivity } from "@/core/audit"
import { emailBrand, rowToSkinInput } from "@/core/branding"
import { sendResendEmail } from "@/core/email/send"
import { getAppEmailFrom, getResendKey } from "@/core/env"
import { createFormatters, defaultTimeZone, isTimeZone, pickLocale, resolveCopy } from "@/core/i18n"
import { getCopy } from "@/core/i18n/server"
import { isAdminLike, type Role } from "@/core/permissions"
import { logDbFailure } from "@/core/supabase/diagnostics"
import { createClient } from "@/core/supabase/server"
import { listMembers } from "@/core/team"
import { brandingPublicUrl, requireWorkspace } from "@/core/workspace"
import { feedbackResolvedEmail } from "./resolution-email"
import { RESOLUTION_NOTE_MAX, feedbackSnippet, normalizeNote, personLabel, resolveRecipients } from "./resolution"
import { FEEDBACK_TYPES, type FeedbackType } from "./types"

const MAX_MESSAGE_LENGTH = 2000

export interface SubmitFeedbackInput {
  type: FeedbackType
  message: string
  /** Current pathname, read by the widget with usePathname() — never typed. */
  route: string
  /** navigator.userAgent, read by the widget at submit time. */
  userAgent: string
  viewportW: number
  viewportH: number
}

function isFeedbackType(value: string): value is FeedbackType {
  return (FEEDBACK_TYPES as readonly string[]).includes(value)
}

/**
 * One-way feedback capture. workspace_id and user_id come from the
 * verified server-side session, never from the client — the RLS insert
 * policy (feedback_insert_self) enforces the same pairing independently.
 */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ ok: boolean; message?: string }> {
  const copy = await getCopy()
  const { user, workspace } = await requireWorkspace()

  const message = input.message.trim()
  if (!isFeedbackType(input.type) || !message || message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, message: copy.feedback.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("feedback").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    type: input.type,
    message,
    route: input.route,
    user_agent: input.userAgent,
    viewport_w: Math.round(input.viewportW),
    viewport_h: Math.round(input.viewportH),
  })

  if (error) {
    logDbFailure("feedback.submit", error)
    return { ok: false, message: copy.feedback.error }
  }

  return { ok: true }
}

export interface ResolveFeedbackInput {
  feedbackId: string
  /** Optional; blank is stored as null. */
  note: string
  /** Members to notify. Anything that is not a current member is dropped. */
  notifyUserIds: string[]
}

/** `none` = nobody was selected, so no email was attempted. */
export type ResolveEmailStatus = "sent" | "failed" | "none"

export interface ResolveFeedbackResult {
  ok: boolean
  /** Set only when `ok` is false. */
  message?: string
  email?: ResolveEmailStatus
  recipientCount?: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function siteOrigin(): Promise<string> {
  const h = await headers()
  const origin = h.get("origin")
  if (origin) return origin
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

/**
 * Marks a feedback row resolved and notifies the chosen members, in one
 * action. Resolution is a NEW ROW in `feedback_resolutions` — `feedback`
 * itself is never touched — and it is the point of no return: once the
 * row exists the action reports ok, whatever happens to the email. A
 * failed send comes back as `email: "failed"` so the UI can warn without
 * blocking; it never rolls the resolution back or turns into an error.
 *
 * Owner/admin only, checked here from the verified workspace membership;
 * the `feedback_resolutions_insert_admin` policy enforces the same rule
 * (plus actor = caller and same-workspace feedback) independently.
 */
export async function resolveFeedback(input: ResolveFeedbackInput): Promise<ResolveFeedbackResult> {
  const copy = await getCopy()
  const fail = (message: string): ResolveFeedbackResult => ({ ok: false, message })

  const { user, workspace, settings } = await requireWorkspace()
  if (!isAdminLike(workspace.role as Role)) return fail(copy.feedback.resolveError)

  const note = normalizeNote(input.note)
  if (typeof input.feedbackId !== "string" || !UUID.test(input.feedbackId)) return fail(copy.feedback.resolveError)
  if (note && note.length > RESOLUTION_NOTE_MAX) return fail(copy.feedback.resolveError)
  const selected = Array.isArray(input.notifyUserIds) ? input.notifyUserIds.filter((v): v is string => typeof v === "string") : []

  const supabase = await createClient()
  const { data: feedback, error: readError } = await supabase
    .from("feedback")
    .select("id, user_id, message, created_at")
    .eq("workspace_id", workspace.id)
    .eq("id", input.feedbackId)
    .maybeSingle()
  if (readError || !feedback) return fail(copy.feedback.resolveError)

  const members = await listMembers(workspace.id)
  const recipients = resolveRecipients(members, selected)

  const { error: insertError } = await supabase.from("feedback_resolutions").insert({
    feedback_id: feedback.id as string,
    workspace_id: workspace.id,
    resolved_by: user.id,
    resolution_note: note,
    notified_user_ids: recipients.map((r) => r.userId),
  })
  if (insertError) {
    if (insertError.code === "23505") return fail(copy.feedback.resolveAlready)
    logDbFailure("feedback.resolve", insertError)
    return fail(copy.feedback.resolveError)
  }

  // From here on the resolution exists: nothing below may turn this into a failure.
  const message = feedback.message as string
  await recordActivity({
    workspaceId: workspace.id,
    action: "feedback.resolved",
    resourceType: "feedback",
    resourceId: feedback.id as string,
    resourceLabel: feedbackSnippet(message),
    metadata: { notified: recipients.length, hasNote: note !== null },
  })

  let email: ResolveEmailStatus = "none"
  if (recipients.length > 0) {
    email = "failed"
    try {
      email = await sendResolvedEmail({ recipients, message, note, feedback: { userId: feedback.user_id as string, createdAt: feedback.created_at as string }, members, resolver: { id: user.id, email: user.email }, workspace, settings })
    } catch (error) {
      console.error("[feedback] resolved email failed:", error instanceof Error ? error.message : error)
    }
  }

  revalidatePath("/settings/feedback")
  return { ok: true, email, recipientCount: recipients.length }
}

async function sendResolvedEmail(args: {
  recipients: ReturnType<typeof resolveRecipients>
  message: string
  note: string | null
  feedback: { userId: string; createdAt: string }
  members: Awaited<ReturnType<typeof listMembers>>
  resolver: { id: string; email: string }
  workspace: { name: string }
  settings: Awaited<ReturnType<typeof requireWorkspace>>["settings"]
}): Promise<ResolveEmailStatus> {
  const key = getResendKey()
  if (!key) {
    console.error("[feedback] resolved email skipped: RESEND_API_KEY is not configured")
    return "failed"
  }
  const { settings, members } = args

  // App-sent mail speaks the WORKSPACE's locale and zone, like invitations.
  const locale = pickLocale(settings.default_locale)
  const zone = isTimeZone(settings.time_zone) ? settings.time_zone : defaultTimeZone
  const fmt = createFormatters(locale, zone)

  let brand: { accent?: string; accentInk?: string; accentDark?: string; accentInkDark?: string; logoUrl?: string | null } = {}
  try {
    const skin = rowToSkinInput(settings)
    const dark = emailBrand(skin, "dark")
    brand = { ...emailBrand(skin), accentDark: dark.accent, accentInkDark: dark.accentInk, logoUrl: brandingPublicUrl(settings.logo_light_path) }
  } catch {
    // Neutral defaults in the template.
  }

  const submitter = members.find((m) => m.userId === args.feedback.userId)
  const resolver = members.find((m) => m.userId === args.resolver.id) ?? { displayName: null, email: args.resolver.email }

  const { subject, html, text } = feedbackResolvedEmail({
    workspaceName: settings.display_name || args.workspace.name,
    message: args.message,
    // A former member, or one with no profile on record, leaves nothing to show.
    submittedBy: (submitter ? personLabel(submitter) : "") || resolveCopy(locale).audit.formerMember,
    submittedAt: fmt.dateTime(args.feedback.createdAt),
    resolvedBy: personLabel(resolver),
    note: args.note,
    feedbackUrl: `${await siteOrigin()}/settings/feedback`,
    locale,
    ...brand,
  })

  const result = await sendResendEmail(key, { from: getAppEmailFrom(), to: args.recipients.map((r) => r.email), subject, html, text })
  if (!result.ok) {
    console.error("[feedback] resolved email failed:", result.status ?? "network", result.detail)
    return "failed"
  }
  return "sent"
}
