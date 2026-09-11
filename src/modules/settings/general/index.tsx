import { rowToGeometry, rowToSkinInput } from "@/core/branding"
import { isTimeZone, pickLocale, defaultTimeZone } from "@/core/i18n"
import { isAdminLike, type Role } from "@/core/permissions"
import { createClient } from "@/core/supabase/server"
import { listMembers } from "@/core/team"
import { brandingPublicUrl, requireWorkspace } from "@/core/workspace"
import { GeneralScreen } from "./general-screen"

/**
 * Server entry: workspace identity, regional and membership defaults, and
 * brand (theme, logo/favicon, colour, type, shape) — one page, one fetch.
 */
export default async function GeneralModule() {
  const { workspace, settings } = await requireWorkspace()
  const supabase = await createClient()
  const [created, members] = await Promise.all([
    supabase.from("workspaces").select("created_at").eq("id", workspace.id).maybeSingle(),
    listMembers(workspace.id),
  ])
  const owner = members.find((m) => m.role === "owner")
  const canEdit = isAdminLike(workspace.role as Role)

  return (
    <GeneralScreen
      initial={{
        displayName: settings.display_name,
        defaultLocale: pickLocale(settings.default_locale),
        timeZone: isTimeZone(settings.time_zone) ? settings.time_zone : defaultTimeZone,
        defaultMemberRole: (["admin", "member", "viewer"].includes(settings.default_member_role) ? settings.default_member_role : "member") as "admin" | "member" | "viewer",
        canEdit,
        facts: {
          id: workspace.id,
          slug: workspace.slug,
          createdAt: (created.data?.created_at as string | undefined) ?? null,
          owner: owner?.displayName ?? owner?.email ?? null,
          memberCount: members.length,
        },
        brand: {
          defaultAppearance: settings.default_appearance,
          skin: rowToSkinInput(settings),
          geometry: rowToGeometry(settings),
          logoLightUrl: brandingPublicUrl(settings.logo_light_path),
          logoDarkUrl: brandingPublicUrl(settings.logo_dark_path),
          faviconUrl: brandingPublicUrl(settings.favicon_path),
        },
      }}
    />
  )
}
