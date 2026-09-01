"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { validateEmail } from "@/core/auth/email-validation"
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
  const ctx = await requireWorkspace()
  const actor = ctx.workspace.role as Role
  const allowed = assignableRoles(actor)
  if (allowed.length === 0) return { ok: false, message: "Only an owner or admin can invite people." }
  if (!isValidRole(rawRole) || !allowed.includes(rawRole)) {
    return { ok: false, message: `You can invite people as ${allowed.join(" or ")} — not ${rawRole}.` }
  }
  const check = validateEmail(rawEmail)
  if (!check.ok) return { ok: false, message: check.message }
  const email = normalizeEmail(check.email)

  const supabase = await createClient()

  const members = await supabase
    .from("workspace_members")
    .select("user_id, profiles!inner(email)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("profiles.email", email)
    .limit(1)
  if ((members.data ?? []).length > 0) {
    return { ok: false, message: `${email} is already a member of this workspace.` }
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
      return { ok: false, message: `${email} already has a pending invitation — resend it instead.` }
    }
    console.error("[team] invite failed:", error.code)
    return { ok: false, message: "Could not create the invitation. Try again." }
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
    return { ok: false, message: e instanceof Error ? e.message : "The email could not be sent." }
  }

  revalidatePath("/settings/team")
  return { ok: true }
}

/** Resend rotates the token: the previous emailed link stops working. */
export async function resendInvitation(invitationId: string): Promise<TeamActionResult> {
  const ctx = await requireWorkspace()
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, status")
    .eq("id", invitationId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle()
  if (!inv) return { ok: false, message: "That invitation no longer exists." }
  if (inv.status !== "pending") return { ok: false, message: "Only pending invitations can be resent." }

  const { raw, hash } = mintInvitationToken()
  const { error, count } = await supabase
    .from("workspace_invitations")
    .update({ token_hash: hash, expires_at: invitationExpiry(), updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", invitationId)
    .eq("status", "pending")
  if (error || !count) return { ok: false, message: "Could not resend — check your access and try again." }

  try {
    await sendInvitationEmail({
      to: inv.email,
      workspaceName: ctx.settings.display_name,
      inviterEmail: ctx.user.email,
      role: inv.role as Role,
      acceptUrl: `${await siteOrigin()}/invite/${raw}`,
    })
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "The email could not be sent." }
  }

  revalidatePath("/settings/team")
  return { ok: true }
}

export async function revokeInvitation(invitationId: string): Promise<TeamActionResult> {
  const ctx = await requireWorkspace()
  const supabase = await createClient()
  const { error, count } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", invitationId)
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "pending")
  if (error || !count) return { ok: false, message: "Could not revoke — it may already be accepted or gone." }
  revalidatePath("/settings/team")
  return { ok: true }
}

export async function changeMemberRole(userId: string, targetCurrentRole: string, rawRole: string): Promise<TeamActionResult> {
  const ctx = await requireWorkspace()
  const actor = ctx.workspace.role as Role
  if (!isValidRole(rawRole) || !isValidRole(targetCurrentRole)) return { ok: false, message: "Unknown role." }
  if (!canManageTarget(actor, targetCurrentRole)) {
    return { ok: false, message: targetCurrentRole === "owner" ? "The owner's role cannot be changed." : "You cannot manage that member." }
  }
  if (!assignableRoles(actor).includes(rawRole)) {
    return { ok: false, message: `You can assign ${assignableRoles(actor).join(" or ")} — not ${rawRole}.` }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("workspace_members")
    .update({ role: rawRole }, { count: "exact" })
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", userId)
    .neq("role", "owner")
  if (error || !count) return { ok: false, message: "The role was not changed — check your access." }
  revalidatePath("/settings/team")
  return { ok: true }
}

/** Removes workspace membership only — never the person's auth account. */
export async function removeMember(userId: string, targetCurrentRole: string): Promise<TeamActionResult> {
  const ctx = await requireWorkspace()
  const actor = ctx.workspace.role as Role
  if (!isValidRole(targetCurrentRole) || !canManageTarget(actor, targetCurrentRole)) {
    return { ok: false, message: targetCurrentRole === "owner" ? "The owner cannot be removed." : "You cannot remove that member." }
  }
  if (userId === ctx.user.id && actor === "owner") {
    return { ok: false, message: "The owner cannot leave their own workspace." }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("workspace_members")
    .delete({ count: "exact" })
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", userId)
    .neq("role", "owner")
  if (error || !count) return { ok: false, message: "The member was not removed — check your access." }
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
