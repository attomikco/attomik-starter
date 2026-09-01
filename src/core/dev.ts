import { notFound } from "next/navigation"
import { devToolsEnabled } from "./dev-gate"

/**
 * Development tooling gate. The /dev/* review surfaces (theme, shell, data,
 * auth states) are kept for maintaining the starter but are never part of
 * the production product: in production builds they return the normal
 * not-found state and appear in no navigation.
 */
export { devToolsEnabled }

export function requireDevelopment(): void {
  if (!devToolsEnabled(process.env.NODE_ENV)) notFound()
}
