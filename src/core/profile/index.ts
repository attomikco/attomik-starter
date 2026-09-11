import { cache } from "react"
import { requireUser } from "@/core/auth/require-user"
import { createClient } from "@/core/supabase/server"

/**
 * The current user's own profile — display name and avatar, editable only
 * by that user (profiles RLS: id = auth.uid()). Distinct from
 * src/core/workspace, which is workspace-scoped; a profile has no
 * workspace and no role gate. Unlike branding assets (which store a
 * relative storage path, resolved to a URL at read time),
 * `profiles.avatar_url` stores the resolved public URL directly — there
 * is exactly one reader (the account owner's own shell/profile screen),
 * so there is no shared resolver to keep in sync.
 */

export interface OwnProfile {
  displayName: string | null
  avatarUrl: string | null
}

export const getOwnProfile = cache(async (): Promise<OwnProfile> => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()
  const row = data as { display_name: string | null; avatar_url: string | null } | null
  return {
    displayName: row?.display_name ?? null,
    avatarUrl: row?.avatar_url ?? null,
  }
})
