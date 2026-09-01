import type { Metadata } from "next"
import type { ReactNode } from "react"
import { rowToGeometry, rowToSkinInput, skinStylesheetWithDefault, themedDeclarations } from "@/core/branding"
import { brandingPublicUrl, requireWorkspace } from "@/core/workspace"
import { AppShell } from "@/ui/shell/app-shell"

/**
 * The (app) frame resolves the canonical chain server-side:
 * authenticated user → current workspace → workspace settings → skin.
 * The workspace skin is injected as a stylesheet that overrides the base
 * skin from the root layout, so workspace branding is correct in the
 * initial HTML — no default-skin flash.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await requireWorkspace()
  const favicon = brandingPublicUrl(settings.favicon_path)
  return {
    title: settings.display_name,
    ...(favicon ? { icons: { icon: favicon } } : {}),
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, workspace, settings } = await requireWorkspace()

  const skin = rowToSkinInput(settings)
  const geometry = rowToGeometry(settings)
  const css =
    skinStylesheetWithDefault(skin, settings.default_appearance, geometry) +
    "\n" +
    // Logo visibility rides the exact same theme selectors as the tokens,
    // so the right ground's logo always matches the active palette.
    themedDeclarations(
      settings.default_appearance,
      "--logo-light-display: block; --logo-dark-display: none;",
      "--logo-light-display: none; --logo-dark-display: block;",
    )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <AppShell
        account={{ email: user.email }}
        workspace={{
          name: settings.display_name || workspace.name,
          logoLightUrl: brandingPublicUrl(settings.logo_light_path),
          logoDarkUrl: brandingPublicUrl(settings.logo_dark_path),
        }}
      >
        {children}
      </AppShell>
    </>
  )
}
