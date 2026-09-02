import { resolveCopy, type Locale } from "@/core/i18n"
import { getEnabledModules } from "@/core/modules"
import { buildNavigation, type NavigationCopy, type NavigationGroup, type NavigationItem } from "./build"

/**
 * Navigation derives entirely from the module registry + project config,
 * with on-screen names from the dictionary of the ACTIVE locale. There is
 * no hand-maintained nav list anywhere in the codebase.
 */

export type { NavigationCopy, NavigationGroup, NavigationItem }
export { GROUP_ORDER } from "./build"

export function getEnabledNavigation(locale: Locale): NavigationGroup[] {
  return buildNavigation(getEnabledModules(), resolveCopy(locale).nav.modules)
}
