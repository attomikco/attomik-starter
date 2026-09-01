import { cache } from "react"
import { defaultSkin, skinInputToRow, type WorkspaceBrandRow } from "@/core/branding"
import { requireUser, type AuthUser } from "@/core/auth/require-user"
import { getSupabaseEnv } from "@/core/env"
import { createClient } from "@/core/supabase/server"
import { projectConfig } from "@/config/project"

/**
 * The canonical workspace access layer. Server-only. Modules never
 * rediscover the workspace themselves and never touch these tables
 * directly — they go through this layer (or the settings module's server
 * actions, which build on it).
 *
 * Multi-workspace is deliberately not built yet: a user's first (only)
 * workspace is the current one. The shapes keep a future switcher possible.
 */

export interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

export interface WorkspaceSettings extends WorkspaceBrandRow {
  workspace_id: string
}

export interface WorkspaceContext {
  user: AuthUser
  workspace: Workspace
  settings: WorkspaceSettings
}

/**
 * Bootstrap: first sign-in creates profile → workspace → owner membership →
 * default settings (canonical base skin, light default appearance). Each
 * step is idempotent; RLS permits exactly this self-service path.
 */
async function ensureWorkspaceForUser(user: AuthUser): Promise<void> {
  const supabase = await createClient()

  await supabase.from("profiles").upsert(
    { id: user.id, email: user.email },
    { onConflict: "id", ignoreDuplicates: true },
  )

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle()
  if (membership) return

  const name = projectConfig.name
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${user.id.slice(0, 8)}`
  // The id is generated here, not RETURNING'd: the SELECT policy requires
  // membership, which doesn't exist until the owner row lands one step later.
  const workspaceId = crypto.randomUUID()
  const { error: wsError } = await supabase
    .from("workspaces")
    .insert({ id: workspaceId, name, slug, created_by: user.id })
  if (wsError) {
    // 23505 = unique_violation on the slug: a concurrent first request won
    // the bootstrap race. Let the caller's membership retry pick it up.
    if (wsError.code === "23505") return
    throw new Error(`Workspace bootstrap failed: ${wsError.message}`)
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner" })
  if (memberError) throw new Error(`Workspace bootstrap failed: ${memberError.message}`)

  const { error: settingsError } = await supabase.from("workspace_settings").insert({
    workspace_id: workspaceId,
    display_name: name,
    default_appearance: "light",
    ...skinInputToRow(defaultSkin),
  })
  if (settingsError) throw new Error(`Workspace bootstrap failed: ${settingsError.message}`)
}

/**
 * Resolves user → workspace → settings, bootstrapping on first sign-in.
 * Deduplicated per request via React cache, so the layout and any server
 * action in the same request share one lookup.
 */
export const requireWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const user = await requireUser()
  const supabase = await createClient()

  let { data: row } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .limit(1)
    .maybeSingle()

  if (!row) {
    await ensureWorkspaceForUser(user)
    const retry = await supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, slug)")
      .limit(1)
      .maybeSingle()
    row = retry.data as typeof row
  }
  const ws = (row as { workspaces?: { id: string; name: string; slug: string } } | null)?.workspaces
  if (!row || !ws) throw new Error("No workspace available for user")

  const { data: settings, error } = await supabase
    .from("workspace_settings")
    .select("*")
    .eq("workspace_id", ws.id)
    .single()
  if (error || !settings) throw new Error(`Workspace settings missing: ${error?.message ?? ""}`)

  return {
    user,
    workspace: { id: ws.id, name: ws.name, slug: ws.slug, role: (row as { role: string }).role },
    settings: settings as WorkspaceSettings,
  }
})

export async function getCurrentWorkspace(): Promise<Workspace> {
  return (await requireWorkspace()).workspace
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  return (await requireWorkspace()).settings
}

/** Public URL for a branding asset path stored in the public branding bucket. */
export function brandingPublicUrl(path: string | null): string | null {
  if (!path) return null
  const { url } = getSupabaseEnv()
  return `${url}/storage/v1/object/public/branding/${path}`
}
