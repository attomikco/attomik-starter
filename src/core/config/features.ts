import { notFound } from "next/navigation"
import { projectConfig, type FeatureId } from "@/config/project"

/**
 * The single source of truth for optional-capability enablement, mirroring
 * `core/modules`' `isModuleEnabled` for `projectConfig.features`. Core
 * capabilities that a project turns on/off (not a module: no routes of
 * their own, no nav entry) read their flag through this helper rather than
 * reaching into `projectConfig.features` directly.
 */
export function isFeatureEnabled(id: FeatureId): boolean {
  return !!projectConfig.features[id]
}

/**
 * Route guard for screens that only make sense while a feature is on
 * (e.g. Settings → Feedback). Renders the not-found state when it is off;
 * the proxy blocks the same routes so the status is a true 404.
 */
export function requireFeature(id: FeatureId): void {
  if (!isFeatureEnabled(id)) notFound()
}
