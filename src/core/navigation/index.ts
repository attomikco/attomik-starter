import { getEnabledModules } from "@/core/modules"
import type { ModuleId } from "@/config/project"
import type { NavGroup } from "@/core/modules/registry"

/**
 * Navigation derives entirely from the module registry + project config.
 * There is no hand-maintained nav list anywhere in the codebase.
 */

export interface NavigationItem {
  moduleId: ModuleId
  group: NavGroup
  label: string
  href: string
  order: number
}

export interface NavigationGroup {
  group: NavGroup
  items: NavigationItem[]
}

/** Display order of the rail groups, mirroring the design-reference shell. */
const GROUP_ORDER: readonly NavGroup[] = ["operate", "configure", "settings"]

export function getEnabledNavigation(): NavigationGroup[] {
  const items: NavigationItem[] = getEnabledModules()
    .flatMap((mod) => (mod.navigation ? [{ moduleId: mod.id, ...mod.navigation }] : []))
    .sort((a, b) => a.order - b.order)

  return GROUP_ORDER.flatMap((group) => {
    const groupItems = items.filter((item) => item.group === group)
    return groupItems.length > 0 ? [{ group, items: groupItems }] : []
  })
}
