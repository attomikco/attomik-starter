import { rowToGeometry, rowToSkinInput } from "@/core/branding"
import { brandingPublicUrl, requireWorkspace } from "@/core/workspace"
import { AppearanceEditor } from "./appearance-editor"

/** Server entry: loads workspace settings and hands the editor its initial state. */
export default async function AppearanceModule() {
  const { workspace, settings } = await requireWorkspace()

  return (
    <AppearanceEditor
      initial={{
        displayName: settings.display_name,
        defaultAppearance: settings.default_appearance,
        skin: rowToSkinInput(settings),
        geometry: rowToGeometry(settings),
        logoLightUrl: brandingPublicUrl(settings.logo_light_path),
        logoDarkUrl: brandingPublicUrl(settings.logo_dark_path),
        faviconUrl: brandingPublicUrl(settings.favicon_path),
        canEdit: workspace.role === "owner" || workspace.role === "admin",
      }}
    />
  )
}
