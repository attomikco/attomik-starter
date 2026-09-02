import type { ModuleId } from "@/config/project"

/**
 * Canonical module registry. Every module the starter ships is defined here,
 * whether or not the current project enables it (that lives in
 * `src/config/project.ts`). Definitions are plain data — no React imports —
 * so the registry can be read from server code, scripts, and tests alike.
 *
 * Navigation groups mirror the design-reference rail: "operate" for daily
 * work, "configure" for setup and data movement, "settings" for admin.
 */

export type NavGroup = "operate" | "configure" | "settings"

/**
 * On-screen names are NOT here: `copy.nav.modules[id]` (core/i18n) holds
 * the label and description per module in every locale, and
 * `children[].key` indexes that module's child labels. The registry stays
 * identifiers and structure, resolved at navigation-build time.
 */
export interface ModuleNavigation {
  group: NavGroup
  href: string
  order: number
  /** Icon key, mapped to the reference SVG path in src/ui/shell/icons.tsx */
  icon: string
  /** Submenu items (the reference rail's child rows): a copy key under this module, and the route. */
  children?: readonly { key: string; href: string }[]
}

export interface ModuleDefinition {
  id: ModuleId
  navigation?: ModuleNavigation
  permissions?: readonly string[]
  dependencies?: readonly ModuleId[]
}

export const moduleRegistry = {
  overview: {
    id: "overview",
    navigation: {
      group: "operate",
      icon: "overview",
      href: "/",
      order: 0,
    },
    permissions: ["overview.view"],
  },

  analytics: {
    id: "analytics",
    navigation: {
      group: "operate",
      icon: "analytics",
      href: "/analytics",
      order: 10,
    },
    permissions: ["analytics.view"],
  },

  customers: {
    id: "customers",
    navigation: {
      group: "operate",
      icon: "customers",
      href: "/customers",
      order: 20,
    },
    permissions: ["customers.view", "customers.edit"],
  },

  media: {
    id: "media",
    navigation: {
      group: "configure",
      icon: "media",
      href: "/media",
      order: 10,
    },
    permissions: ["media.view", "media.upload", "media.delete"],
  },
  // Settings is core-adjacent but registered as a module so navigation,
  // palette, and guards stay registry-driven. Projects keep it enabled.
  settings: {
    id: "settings",
    navigation: {
      group: "settings",
      icon: "settings",
      href: "/settings/appearance",
      order: 0,
      children: [
        { key: "appearance", href: "/settings/appearance" },
        { key: "team", href: "/settings/team" },
        { key: "activity", href: "/settings/activity" },
        { key: "language", href: "/settings/language" },
      ],
    },
    permissions: ["settings.view", "settings.manage"],
  },
} satisfies Partial<Record<ModuleId, ModuleDefinition>>

/** Modules that have a definition. Config may list more ids than are registered yet. */
export type RegisteredModuleId = keyof typeof moduleRegistry
