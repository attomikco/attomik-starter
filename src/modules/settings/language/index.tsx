import { isLocale, pickLocale } from "@/core/i18n"
import { getLocaleSources } from "@/core/i18n/server"
import { isAdminLike, type Role } from "@/core/permissions"
import { requireWorkspace } from "@/core/workspace"
import { LanguageScreen } from "./language-screen"

/** Server entry: the user's saved choice and the workspace default. */
export default async function LanguageModule() {
  const [{ workspace, settings }, sources] = await Promise.all([requireWorkspace(), getLocaleSources()])

  return (
    <LanguageScreen
      initial={{
        userLocale: isLocale(sources.profile) ? sources.profile : null,
        workspaceLocale: pickLocale(settings.default_locale),
        canEditWorkspace: isAdminLike(workspace.role as Role),
      }}
    />
  )
}
