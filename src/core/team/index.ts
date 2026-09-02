import { createHash, randomBytes } from "node:crypto"
import { emailBrand, rowToSkinInput } from "@/core/branding"
import { getResendKey } from "@/core/env"
import { pickLocale, resolveCopy } from "@/core/i18n"
import type { Role } from "@/core/permissions"
import { createClient } from "@/core/supabase/server"
import { brandingPublicUrl, getWorkspaceSettings } from "@/core/workspace"
import { invitationEmail } from "./invitation-email"

/**
 * Canonical team data access + invitation lifecycle helpers. Server-only;
 * the Team UI never touches tables or tokens directly. RLS enforces every
 * rule again at the database — these helpers are the convenient path, not
 * the boundary.
 */

export const INVITATION_TTL_DAYS = 7

export interface TeamMember {
  userId: string
  email: string
  displayName: string | null
  role: Role
  joinedAt: string
}

export interface PendingInvitation {
  id: string
  email: string
  role: Role
  invitedBy: string
  expiresAt: string
  createdAt: string
}

export async function listMembers(workspaceId: string): Promise<TeamMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Could not load members: ${error.message}`)
  const rows = data ?? []

  // workspace_members has no FK to profiles (both reference auth.users), so
  // identity comes from a second RLS-scoped query rather than an embed.
  const ids = rows.map((r) => r.user_id as string)
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, email, display_name").in("id", ids)
    : { data: [] }
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]))

  return rows.map((row) => {
    const profile = byId.get(row.user_id as string)
    return {
      userId: row.user_id as string,
      email: (profile?.email as string) ?? "",
      displayName: (profile?.display_name as string | null) ?? null,
      role: row.role as Role,
      joinedAt: row.created_at as string,
    }
  })
}

export async function listPendingInvitations(workspaceId: string): Promise<PendingInvitation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, invited_by, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`Could not load invitations: ${error.message}`)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    email: r.email as string,
    role: r.role as Role,
    invitedBy: r.invited_by as string,
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
  }))
}

/** Cryptographically strong single-use token; only its sha256 is stored. */
export function mintInvitationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url")
  return { raw, hash: createHash("sha256").update(raw).digest("hex") }
}

export function invitationExpiry(): string {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/** Sends the invitation email through Resend. Throws with a safe message. */
export async function sendInvitationEmail(input: {
  to: string
  workspaceName: string
  inviterEmail: string
  role: Role
  acceptUrl: string
}): Promise<void> {
  const key = getResendKey()
  if (!key) throw new Error("Email is not configured (RESEND_API_KEY missing)")
  const from = process.env.APP_EMAIL_FROM?.trim() || "Attomik Starter <auth@email.attomik.co>"

  // Workspace brand for the email: accent as literal hex, light-ground
  // logo. requireWorkspace is request-cached, so this reuses the invite
  // action's own lookup; branding failures never block the invitation.
  // The recipient has no profile yet, so the email speaks the WORKSPACE
  // default locale — the same one the sign-in screens will greet them in.
  let brand: { accent?: string; accentInk?: string; logoUrl?: string | null } = {}
  let locale = pickLocale()
  try {
    const settings = await getWorkspaceSettings()
    locale = pickLocale(settings.default_locale)
    brand = {
      ...emailBrand(rowToSkinInput(settings)),
      logoUrl: brandingPublicUrl(settings.logo_light_path),
    }
  } catch {
    // Neutral defaults in the template.
  }

  const { subject, html, text } = invitationEmail({
    workspaceName: input.workspaceName,
    inviterEmail: input.inviterEmail,
    role: resolveCopy(locale).roles.labels[input.role],
    acceptUrl: input.acceptUrl,
    expiresInDays: INVITATION_TTL_DAYS,
    locale,
    ...brand,
  })

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject, html, text }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    console.error("[team] invitation email failed:", res.status, detail.slice(0, 300))
    throw new Error("The invitation was created but the email could not be sent")
  }
}
