import type { ReactNode } from "react"
import { requireUser } from "@/core/auth/require-user"
import { AppShell } from "@/ui/shell/app-shell"

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Verified server-side identity. The proxy redirects with a `next` path;
  // this guard also holds where Server Function calls bypass the proxy.
  const user = await requireUser()

  return <AppShell account={{ email: user.email }}>{children}</AppShell>
}
