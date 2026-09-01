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

export function AppShell({
  children,
  chrome = "full",
  account,
}: {
  children: ReactNode
  chrome?: "inset" | "full"
  account: ShellAccount
}) {
  const navigation = getEnabledNavigation()

  return (
    <AppShellClient navigation={navigation} chrome={chrome} account={account}>
      {children}
    </AppShellClient>
  )
}
