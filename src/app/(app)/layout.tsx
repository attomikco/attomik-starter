import type { Metadata } from "next"
import type { ReactNode } from "react"
import { rowToGeometry, rowToSkinInput, skinStylesheetWithDefault, themedDeclarations } from "@/core/branding"
import { isLocale, pickLocale } from "@/core/i18n"
import { getLocaleSources } from "@/core/i18n/server"
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
  const [{ user, workspace, settings }, localeSources] = await Promise.all([requireWorkspace(), getLocaleSources()])

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

  // Pre-paint resolver: same chain as ThemeProvider (local override ??
  // workspace default; "system" → prefers-color-scheme), so Auto+dark-OS
  // paints dark from the first frame with no flash.
  const resolver =
    `(function(){try{var l=localStorage.getItem("attomik-theme");` +
    `var p=(l==="light"||l==="dark")?l:${JSON.stringify(settings.default_appearance)};` +
    `var r=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;` +
    `document.documentElement.dataset.theme=r}catch(e){}})()`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <script dangerouslySetInnerHTML={{ __html: resolver }} />
      <AppShell
        account={{
          email: user.email,
          locale: isLocale(localeSources.profile) ? localeSources.profile : null,
          workspaceLocale: pickLocale(settings.default_locale),
        }}
        workspace={{
          name: settings.display_name || workspace.name,
          logoLightUrl: brandingPublicUrl(settings.logo_light_path),
          logoDarkUrl: brandingPublicUrl(settings.logo_dark_path),
          defaultAppearance: settings.default_appearance,
        }}
      >
        {children}
      </AppShell>
    </>
  )
}
