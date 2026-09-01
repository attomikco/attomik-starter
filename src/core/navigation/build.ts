import type { ModuleId } from "@/config/project"
import type { ModuleDefinition, NavGroup } from "@/core/modules/registry"

/**
 * Pure navigation derivation — no runtime imports so it is unit-testable
 * with the plain Node test runner. `getEnabledNavigation()` in index.ts is
 * the app-facing wrapper.
 */

export interface NavigationItem {
  moduleId: ModuleId
  group: NavGroup
  label: string
  href: string
  order: number
  icon: string
  children?: readonly { label: string; href: string }[]
}

export interface NavigationGroup {
  group: NavGroup
  items: NavigationItem[]
}

/** Display order of the rail groups, mirroring the design-reference shell. */
export const GROUP_ORDER: readonly NavGroup[] = ["operate", "configure", "settings"]

/** Rail group headings as the reference renders them. */
export const GROUP_LABELS: Record<NavGroup, string> = {
  operate: "Operate",
  configure: "Configure",
  settings: "Settings",
}

export function buildNavigation(modules: ModuleDefinition[]): NavigationGroup[] {
  const items: NavigationItem[] = modules
    .flatMap((mod) => (mod.navigation ? [{ moduleId: mod.id, ...mod.navigation }] : []))
    .sort((a, b) => a.order - b.order)

  return GROUP_ORDER.flatMap((group) => {
    const groupItems = items.filter((item) => item.group === group)
    return groupItems.length > 0 ? [{ group, items: groupItems }] : []
  })
}
