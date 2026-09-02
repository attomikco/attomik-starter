import { pickLocale } from "@/core/i18n"
import { isAdminLike, type Role } from "@/core/permissions"
import { requireWorkspace } from "@/core/workspace"
import { GeneralScreen } from "./general-screen"

/** Server entry: workspace identity and regional defaults. */
export default async function GeneralModule() {
  const { workspace, settings } = await requireWorkspace()

  return (
    <GeneralScreen
      initial={{
        displayName: settings.display_name,
        defaultLocale: pickLocale(settings.default_locale),
        canEdit: isAdminLike(workspace.role as Role),
      }}
    />
  )
}
