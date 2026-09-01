import type { ReactNode } from "react"
import { getEnabledNavigation } from "@/core/navigation"
import { AppShellClient } from "./app-shell-client"

/**
 * Server boundary for the shell: resolves enabled navigation from the module
 * registry and hands plain data to the client shell. Production uses
 * chrome="full" per design-reference/IMPLEMENTATION.md §3.2 (edge to edge);
 * "inset" reproduces the framed design-artifact presentation.
 */
export function AppShell({ children, chrome = "full" }: { children: ReactNode; chrome?: "inset" | "full" }) {
  const navigation = getEnabledNavigation()

  return (
    <AppShellClient navigation={navigation} chrome={chrome}>
      {children}
    </AppShellClient>
  )
}
