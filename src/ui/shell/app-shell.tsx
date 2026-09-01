import type { ReactNode } from "react"
import { getEnabledNavigation } from "@/core/navigation"
import { AppShellClient } from "./app-shell-client"

/**
 * Server boundary for the shell: resolves enabled navigation from the module
 * registry and hands plain data to the client shell. Production uses
 * chrome="full" per design-reference/IMPLEMENTATION.md §3.2 (edge to edge);
 * "inset" reproduces the framed design-artifact presentation.
 */
export interface ShellAccount {
  email: string
}

export interface ShellWorkspace {
  name: string
  logoLightUrl: string | null
  logoDarkUrl: string | null
}

export function AppShell({
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
  const navigation = getEnabledNavigation()

  return (
    <AppShellClient navigation={navigation} chrome={chrome} account={account} workspace={workspace}>
      {children}
    </AppShellClient>
  )
}
