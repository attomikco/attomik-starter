import type { ModuleId } from "@/config/project"
import type { ModuleDefinition, NavGroup } from "@/core/modules/registry"
// Relative .ts import keeps this module runnable under `node --test`.
import { hasRank, type Role } from "../permissions/index.ts"

/**
 * Pure navigation derivation — no runtime imports so it is unit-testable
 * with the plain Node test runner. `getEnabledNavigation(locale)` in
 * index.ts is the app-facing wrapper that supplies the dictionary section.
 */

/** The `copy.nav.modules` shape: on-screen names keyed by module id. */
export type NavigationCopy = Record<string, { label: string; description: string; children?: Record<string, string> }>

export interface NavigationItem {
  moduleId: ModuleId
  group: NavGroup
  /** Resolved from the dictionary; the registry holds no on-screen text. */
  label: string
  description: string
  href: string
  order: number
  icon: string
  children?: readonly { key: string; label: string; href: string }[]
}

export interface NavigationGroup {
  group: NavGroup
  items: NavigationItem[]
}

/** Display order of the rail groups, mirroring the design-reference shell. */
export const GROUP_ORDER: readonly NavGroup[] = ["operate", "configure", "settings"]

/** A module with no dictionary entry shows its identifier, so the gap is visible in development. */
function namesFor(id: string, copy: NavigationCopy) {
  return copy[id] ?? { label: id, description: "", children: {} }
}

/**
 * `actorRole` drops child rows the actor's rank cannot reach. Omit it and
 * every child is built — callers that have no role context (scripts,
 * tests) still get the full structure.
 */
export function buildNavigation(modules: ModuleDefinition[], copy: NavigationCopy, actorRole?: Role): NavigationGroup[] {
  const reachable = (minRole?: Role) => !minRole || !actorRole || hasRank(actorRole, minRole)

  const items: NavigationItem[] = modules
    .flatMap((mod) => {
      if (!mod.navigation) return []
      const names = namesFor(mod.id, copy)
      const { children, ...nav } = mod.navigation
      const item: NavigationItem = { moduleId: mod.id, ...nav, label: names.label, description: names.description }
      if (children) {
        item.children = children
          .filter((c) => reachable(c.minRole))
          .map(({ minRole: _minRole, ...c }) => ({ ...c, label: names.children?.[c.key] ?? c.key }))
      }
      return [item]
    })
    .sort((a, b) => a.order - b.order)

  return GROUP_ORDER.flatMap((group) => {
    const groupItems = items.filter((item) => item.group === group)
    return groupItems.length > 0 ? [{ group, items: groupItems }] : []
  })
}
