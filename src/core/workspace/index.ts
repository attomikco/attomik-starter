import { cache } from "react"
import { bootstrapWorkspace } from "./bootstrap"
import {
  DEFAULT_GEOMETRY,
  defaultSkin,
  rowToGeometry,
  rowToSkinInput,
  skinInputToRow,
  type ProductGeometry,
  type SkinInput,
  type WorkspaceBrandRow,
} from "@/core/branding"
import { requireUser, type AuthUser } from "@/core/auth/require-user"
import { getSupabaseEnv, hasSupabaseEnv } from "@/core/env"
import { createClient } from "@/core/supabase/server"
import { projectConfig } from "@/config/project"
import { pickLocale, type Locale } from "@/core/i18n"

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
 * default settings (canonical base skin, light default appearance).
 *
 * The algorithm lives in bootstrap.ts and is idempotent and race-safe:
 * every step tolerates "already done", a slug conflict adopts the
 * concurrent winner's workspace instead of giving up, and membership /
 * settings land with ON CONFLICT DO NOTHING so concurrent racers converge
 * on the same rows. RLS permits exactly this self-service path (creator
 * visibility on workspaces, creator claiming the owner seat, owner
 * writing settings).
 */
async function ensureWorkspaceForUser(user: AuthUser): Promise<void> {
  const supabase = await createClient()
  const name = projectConfig.name

  await bootstrapWorkspace(
    {
      async ensureProfile() {
        await supabase.from("profiles").upsert(
          { id: user.id, email: user.email },
          { onConflict: "id", ignoreDuplicates: true },
        )
      },
      async hasMembership() {
        const { data } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .limit(1)
          .maybeSingle()
        return !!data
      },
      async findOwnWorkspace() {
        const { data } = await supabase
          .from("workspaces")
          .select("id")
          .eq("created_by", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
        return (data?.id as string | undefined) ?? null
      },
      async insertWorkspace(ws) {
        const { error } = await supabase
          .from("workspaces")
          .insert({ id: ws.id, name: ws.name, slug: ws.slug, created_by: user.id })
        if (!error) return "ok"
        // 23505 = unique_violation on the slug: only a concurrent request
        // for this same user can produce it (the slug embeds the user id).
        if (error.code === "23505") return "conflict"
        throw new Error(`Workspace bootstrap failed: ${error.message}`)
      },
      // Insert-and-tolerate-23505, NOT upsert/ON CONFLICT DO NOTHING: the
      // conflict arbiter evaluates the row against the member-only SELECT
      // policies before this user's membership exists, so DO NOTHING fails
      // RLS for a first-time user (verified live). A duplicate key means
      // the concurrent racer already wrote the row — same outcome.
      async claimOwnerSeat(workspaceId) {
        const { error } = await supabase
          .from("workspace_members")
          .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner" })
        if (error && error.code !== "23505") {
          throw new Error(`Workspace bootstrap failed: ${error.message}`)
        }
      },
      async ensureSettings(workspaceId) {
        const { error } = await supabase.from("workspace_settings").insert({
          workspace_id: workspaceId,
          display_name: name,
          default_appearance: "light",
          default_locale: projectConfig.locale,
          ...skinInputToRow(defaultSkin),
        })
        if (error && error.code !== "23505") {
          throw new Error(`Workspace bootstrap failed: ${error.message}`)
        }
      },
    },
    { name, userId: user.id },
  )
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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!row) {
    await ensureWorkspaceForUser(user)
    const retry = await supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, slug)")
      .order("created_at", { ascending: true })
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

/**
 * Branding for the UNAUTHENTICATED auth surface, via the intentionally
 * public get_auth_branding() RPC (branding columns only, earliest
 * workspace — see docs/AUTH.md). Server-first so the sign-in screens paint
 * the workspace identity with no flash; "system" falls back to light
 * because the server cannot know the visitor's OS preference without a
 * flash. Falls back to the neutral starter identity on a fresh deployment
 * (no workspace yet) or missing Supabase env — auth must always render.
 */
export interface AuthBranding {
  name: string
  skin: SkinInput
  geometry: ProductGeometry
  mode: "light" | "dark"
  /** Workspace default locale — the pre-auth screens' language. */
  locale: Locale
  logoUrl: string | null
  faviconUrl: string | null
}

export const getAuthBranding = cache(async (): Promise<AuthBranding> => {
  const fallback: AuthBranding = {
    name: projectConfig.name, skin: defaultSkin, geometry: DEFAULT_GEOMETRY,
    mode: "light", locale: pickLocale(), logoUrl: null, faviconUrl: null,
  }
  if (!hasSupabaseEnv()) return fallback
  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc("get_auth_branding").maybeSingle()
    if (!data) return fallback
    const row = data as WorkspaceBrandRow
    const mode = row.default_appearance === "dark" ? "dark" : "light"
    const logoPath = mode === "dark"
      ? row.logo_dark_path ?? row.logo_light_path
      : row.logo_light_path ?? row.logo_dark_path
    return {
      name: row.display_name,
      skin: rowToSkinInput(row),
      geometry: rowToGeometry(row),
      mode,
      locale: pickLocale(row.default_locale),
      logoUrl: brandingPublicUrl(logoPath),
      faviconUrl: brandingPublicUrl(row.favicon_path),
    }
  } catch {
    return fallback
  }
})

/** Public URL for a branding asset path stored in the public branding bucket. */
export function brandingPublicUrl(path: string | null): string | null {
  if (!path) return null
  const { url } = getSupabaseEnv()
  return `${url}/storage/v1/object/public/branding/${path}`
}
