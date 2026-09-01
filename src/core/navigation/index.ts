import { getEnabledModules } from "@/core/modules"
import { buildNavigation, type NavigationGroup, type NavigationItem } from "./build"

/**
 * Navigation derives entirely from the module registry + project config.
 * There is no hand-maintained nav list anywhere in the codebase.
 */

export type { NavigationGroup, NavigationItem }
export { GROUP_LABELS, GROUP_ORDER } from "./build"

export function getEnabledNavigation(): NavigationGroup[] {
  return buildNavigation(getEnabledModules())
}
