import type { ReactNode } from "react"
import { isFeatureEnabled } from "@/core/config/features"
import type { Locale } from "@/core/i18n"
import { getLocale } from "@/core/i18n/server"
import { getEnabledNavigation } from "@/core/navigation"
import type { Role } from "@/core/permissions"
import { AppShellClient } from "./app-shell-client"

/**
 * Server boundary for the shell: resolves enabled navigation from the module
 * registry and hands plain data to the client shell. Production uses
 * chrome="full" per design-reference/IMPLEMENTATION.md §3.2 (edge to edge);
 * "inset" reproduces the framed design-artifact presentation.
 */
export interface ShellAccount {
  email: string
  /** The user's saved interface language; null follows the workspace default. */
  locale: Locale | null
  /** The workspace default, named in the "inherit" option. */
  workspaceLocale: Locale
  /** Set via Settings → Profile; null falls back to the email-derived display. */
  displayName: string | null
  avatarUrl: string | null
}

export interface ShellWorkspace {
  name: string
  /** The actor's role in this workspace — hides nav rows they cannot reach. */
  role: Role
  logoLightUrl: string | null
  logoDarkUrl: string | null
  defaultAppearance: "light" | "dark" | "system"
}

export async function AppShell({
  children,
  chrome = "full",
  account,
  workspace,
}: {
  children: ReactNode
  chrome?: "inset" | "full"
  account: ShellAccount
  workspace: ShellWorkspace
}) {
  const navigation = getEnabledNavigation(await getLocale(), workspace.role)
  const feedbackEnabled = isFeatureEnabled("feedbackWidget")

  return (
    <AppShellClient navigation={navigation} chrome={chrome} account={account} workspace={workspace} feedbackEnabled={feedbackEnabled}>
      {children}
    </AppShellClient>
  )
}
