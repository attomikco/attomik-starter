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
  modules: Record<string, boolean>
  features: Record<string, boolean>
}
