import type { SkinPresetId } from "@/core/branding/skins"
import type { Locale } from "@/core/i18n/locales"

/**
 * Per-project configuration. This file is the ONLY place a project decides
 * which modules are on. Module definitions live in `src/core/modules/registry.ts`;
 * everything else (navigation, routing, command palette) derives from these two files.
 */
export const projectConfig = {
  name: "Attomik Starter",

  /**
   * Shell chrome language: <html lang>, search placeholder, rail group
   * headings, shortcuts sheet, data/empty/error states, audit summaries.
   * Dictionaries live in `src/core/i18n`; module copy is the module's own.
   */
  locale: "en",

  /**
   * Default time zone (IANA) for new workspaces; each workspace changes
   * its own on Settings → General. Dates, "today", and period boundaries
   * follow the workspace zone, never the server's.
   */
  timeZone: "America/New_York",

  /**
   * Bootstrap skin: first paint, auth screens, and the branding every new
   * workspace starts with. Presets live in `src/core/branding/skins.ts`;
   * the starter ships the generic `base`. A real project may add its own
   * preset there and point this at it. Workspaces re-brand from
   * Settings → Appearance either way.
   */
  skin: "base",

  modules: {
    overview: true,
    settings: true,
    media: false,
    customers: false,
    analytics: false,
    orders: false,
    approvals: false,
    schedule: false,
    messages: false,
    assistant: false,
    imports: false,
    exports: false,
  },

  features: {
    commandPalette: true,
    darkMode: true,
    notifications: true,
  },
} as const satisfies ProjectConfig

export type ModuleId = keyof typeof projectConfig.modules
export type FeatureId = keyof typeof projectConfig.features

interface ProjectConfig {
  name: string
  locale: Locale
  timeZone: string
  skin: SkinPresetId
  modules: Record<string, boolean>
  features: Record<string, boolean>
}
