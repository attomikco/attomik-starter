import { notFound } from "next/navigation"
import { projectConfig, type ModuleId } from "@/config/project"
import { moduleRegistry, type ModuleDefinition } from "@/core/modules/registry"

/**
 * The single source of truth for module enablement. Navigation, routing,
 * command palette — anything that cares whether a module is on — must go
 * through these helpers rather than reading `projectConfig.modules` directly.
 */

/** A module is enabled when its flag is on and every dependency's flag is on too. */
export function isModuleEnabled(id: ModuleId): boolean {
  if (!projectConfig.modules[id]) return false
  const def: ModuleDefinition | undefined = moduleRegistry[id as keyof typeof moduleRegistry]
  return (def?.dependencies ?? []).every((dep) => projectConfig.modules[dep])
}

/** Registered module definitions that are enabled for this project. */
export function getEnabledModules(): ModuleDefinition[] {
  return Object.values(moduleRegistry).filter((mod) => isModuleEnabled(mod.id))
}

/**
 * Route guard for optional modules. Call at the top of every module route;
 * renders the Next.js not-found state when the module is disabled.
 */
export function requireModule(id: ModuleId): void {
  if (!isModuleEnabled(id)) {
    notFound()
  }
}
