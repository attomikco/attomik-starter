import { cache } from "react"
import { getCurrentUser } from "@/core/auth/require-user"
import { hasSupabaseEnv } from "@/core/env"
import { createClient } from "@/core/supabase/server"
import { getAuthBranding } from "@/core/workspace"
import { createFormatters, type Formatters } from "./format"
import { pickLocale, resolveCopy, type Locale, type ShellCopy } from "./index"
import type { ModuleCopy, Translator } from "./t"

/**
 * Server side of the active locale. Resolved ONCE per request (React
 * cache) and shared by the root layout (<html lang>, LocaleProvider), the
 * shell (navigation labels), server components, and server actions:
 *
 *   signed in:  profile.locale → member workspace default_locale → project
 *   signed out: workspace default_locale (public auth-branding RPC) → project
 *
 * Reads are RLS-scoped (own profile, member workspace) and never block a
 * page: any failure falls through to the next candidate.
 */
export interface LocaleSources {
  /** The signed-in user's saved choice (raw column; null = inherit). */
  profile: string | null
  /** The member workspace's default, or the deployment's for visitors. */
  workspace: string | null
}

export const getLocaleSources = cache(async (): Promise<LocaleSources> => {
  const none: LocaleSources = { profile: null, workspace: null }
  if (!hasSupabaseEnv()) return none
  try {
    const user = await getCurrentUser()
    if (!user) return { profile: null, workspace: (await getAuthBranding()).locale }

    const supabase = await createClient()
    const [profile, workspace] = await Promise.all([
      supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle(),
      supabase.from("workspace_settings").select("default_locale").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    ])
    const fromProfile = (profile.data as { locale?: string | null } | null)?.locale ?? null
    const fromWorkspace = (workspace.data as { default_locale?: string | null } | null)?.default_locale ?? null
    // A member of no workspace yet (an invitee mid-acceptance) still gets
    // the deployment's workspace default, like the sign-in screens.
    return { profile: fromProfile, workspace: fromWorkspace ?? (await getAuthBranding()).locale }
  } catch {
    return none
  }
})

export const getLocale = cache(async (): Promise<Locale> => {
  const sources = await getLocaleSources()
  return pickLocale(sources.profile, sources.workspace)
})

export async function getCopy(): Promise<ShellCopy> {
  return resolveCopy(await getLocale())
}

export async function getT(copy: ModuleCopy): Promise<Translator> {
  return copy.for(await getLocale())
}

export async function getFormat(timeZone?: string): Promise<Formatters> {
  return createFormatters(await getLocale(), timeZone)
}
