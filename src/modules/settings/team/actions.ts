"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { validateEmail } from "@/core/auth/email-validation"
import { getCopy, getT } from "@/core/i18n/server"
import { settingsCopy } from "../copy"
import {
  assignableRoles,
  canManageTarget,
  isValidRole,
  normalizeEmail,
  type Role,
} from "@/core/permissions"
import { createClient } from "@/core/supabase/server"
import {
  invitationExpiry,
  mintInvitationToken,
  sendInvitationEmail,
} from "@/core/team"
import { requireWorkspace } from "@/core/workspace"

/**
 * Team management server actions. Every action re-checks capability from
 * the actor's workspace_members row (via requireWorkspace) and RLS enforces
 * the same rules again at the database — hiding a button is never the
 * boundary. Errors are specific where a safe explanation exists.
 */

export interface TeamActionResult {
  ok: boolean
  message?: string
}

async function siteOrigin(): Promise<string> {
  const h = await headers()
  const origin = h.get("origin")
  if (origin) return origin
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function inviteMember(rawEmail: string, rawRole: string): Promise<TeamActionResult> {
  const t = await getT(settingsCopy)
  const copy = await getCopy()
  const ctx = await requireWorkspace()
  const actor = ctx.workspace.role as Role
  const allowed = assignableRoles(actor)
  if (allowed.length === 0) return { ok: false, message: t("settings.team.error.notAdmin") }
  if (!isValidRole(rawRole) || !allowed.includes(rawRole)) {
    return { ok: false, message: t("settings.team.error.roleNotAllowed", { allowed: allowed.map((r) => copy.roles.labels[r]).join(` ${t("settings.team.or")} `), role: rawRole }) }
  }
  const check = validateEmail(rawEmail)
  if (!check.ok) return { ok: false, message: copy.auth.emailErrors[check.code] }
  const email = normalizeEmail(check.email)

  const supabase = await createClient()

  const members = await supabase
    .from("workspace_members")
    .select("user_id, profiles!inner(email)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("profiles.email", email)
    .limit(1)
  if ((members.data ?? []).length > 0) {
    return { ok: false, message: t("settings.team.error.alreadyMember", { email }) }
  }

  const { raw, hash } = mintInvitationToken()
  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: ctx.workspace.id,
    email,
    role: rawRole,
    invited_by: ctx.user.id,
    token_hash: hash,
    expires_at: invitationExpiry(),
  })
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: t("settings.team.error.alreadyInvited", { email }) }
    }
    console.error("[team] invite failed:", error.code)
    return { ok: false, message: t("settings.team.error.createFailed") }
  }

  try {
    await sendInvitationEmail({
      to: email,
      workspaceName: ctx.settings.display_name,
      inviterEmail: ctx.user.email,
      role: rawRole,
      acceptUrl: `${await siteOrigin()}/invite/${raw}`,
    })
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : t("settings.team.error.emailFailed") }
  }

  revalidatePath("/settings/team")
  return { ok: true }
}

/** Resend rotates the token: the previous emailed link stops working. */
export async function resendInvitation(invitationId: string): Promise<TeamActionResult> {
  const t = await getT(settingsCopy)
  const copy = await getCopy()
  const ctx = await requireWorkspace()
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, status")
    .eq("id", invitationId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle()
  if (!inv) return { ok: false, message: t("settings.team.error.gone") }
  if (inv.status !== "pending") return { ok: false, message: t("settings.team.error.notPending") }

  const { raw, hash } = mintInvitationToken()
  const { error, count } = await supabase
    .from("workspace_invitations")
    .update({ token_hash: hash, expires_at: invitationExpiry(), updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", invitationId)
    .eq("status", "pending")
  if (error || !count) return { ok: false, message: t("settings.team.error.resendFailed") }

  try {
    await sendInvitationEmail({
      to: inv.email,
      workspaceName: ctx.settings.display_name,
      inviterEmail: ctx.user.email,
      role: inv.role as Role,
      acceptUrl: `${await siteOrigin()}/invite/${raw}`,
    })
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : t("settings.team.error.emailFailed") }
  }

  revalidatePath("/settings/team")
  return { ok: true }
}

export async function revokeInvitation(invitationId: string): Promise<TeamActionResult> {
  const t = await getT(settingsCopy)
  const copy = await getCopy()
  const ctx = await requireWorkspace()
  const supabase = await createClient()
  const { error, count } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", invitationId)
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "pending")
  if (error || !count) return { ok: false, message: t("settings.team.error.revokeFailed") }
  revalidatePath("/settings/team")
  return { ok: true }
}

export async function changeMemberRole(userId: string, targetCurrentRole: string, rawRole: string): Promise<TeamActionResult> {
  const t = await getT(settingsCopy)
  const copy = await getCopy()
  const ctx = await requireWorkspace()
  const actor = ctx.workspace.role as Role
  if (!isValidRole(rawRole) || !isValidRole(targetCurrentRole)) return { ok: false, message: t("settings.team.error.unknownRole") }
  if (!canManageTarget(actor, targetCurrentRole)) {
    return { ok: false, message: targetCurrentRole === "owner" ? t("settings.team.error.ownerRole") : t("settings.team.error.cannotManage") }
  }
  if (!assignableRoles(actor).includes(rawRole)) {
    return { ok: false, message: t("settings.team.error.assignNotAllowed", { allowed: assignableRoles(actor).map((r) => copy.roles.labels[r]).join(` ${t("settings.team.or")} `), role: rawRole }) }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("workspace_members")
    .update({ role: rawRole }, { count: "exact" })
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", userId)
    .neq("role", "owner")
  if (error || !count) return { ok: false, message: t("settings.team.error.roleUnchanged") }
  revalidatePath("/settings/team")
  return { ok: true }
}

/** Removes workspace membership only — never the person's auth account. */
export async function removeMember(userId: string, targetCurrentRole: string): Promise<TeamActionResult> {
  const t = await getT(settingsCopy)
  const copy = await getCopy()
  const ctx = await requireWorkspace()
  const actor = ctx.workspace.role as Role
  if (!isValidRole(targetCurrentRole) || !canManageTarget(actor, targetCurrentRole)) {
    return { ok: false, message: targetCurrentRole === "owner" ? t("settings.team.error.ownerRemove") : t("settings.team.error.cannotRemove") }
  }
  if (userId === ctx.user.id && actor === "owner") {
    return { ok: false, message: t("settings.team.error.ownerLeave") }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("workspace_members")
    .delete({ count: "exact" })
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", userId)
    .neq("role", "owner")
  if (error || !count) return { ok: false, message: t("settings.team.error.removeFailed") }
  revalidatePath("/settings/team")
  return { ok: true }
}

/** Invitation acceptance — atomic RPC; see the migration for the checks. */
export async function acceptInvitation(rawToken: string): Promise<{ code: string; workspaceId?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("accept_workspace_invitation", { raw_token: rawToken })
  if (error) {
    console.error("[team] accept failed:", error.code)
    return { code: "error" }
  }
  const result = data as { code: string; workspace_id?: string }
  return { code: result.code, workspaceId: result.workspace_id }
}
