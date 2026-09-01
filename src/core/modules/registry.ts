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

export interface ModuleNavigation {
  group: NavGroup
  label: string
  href: string
  order: number
  /** Icon key, mapped to the reference SVG path in src/ui/shell/icons.tsx */
  icon: string
  /** Submenu items (the reference rail's child rows). Plain data only. */
  children?: readonly { label: string; href: string }[]
}

export interface ModuleDefinition {
  id: ModuleId
  label: string
  description: string
  navigation?: ModuleNavigation
  permissions?: readonly string[]
  dependencies?: readonly ModuleId[]
}

export const moduleRegistry = {
  overview: {
    id: "overview",
    label: "Overview",
    description: "Landing dashboard: stat cards, decision list, next actions.",
    navigation: {
      group: "operate",
      label: "Overview",
      icon: "overview",
      href: "/",
      order: 0,
    },
    permissions: ["overview.view"],
  },

  analytics: {
    id: "analytics",
    label: "Analytics",
    description: "KPI tiles, trend charts, service matrix, cohorts.",
    navigation: {
      group: "operate",
      label: "Analytics",
      icon: "analytics",
      href: "/analytics",
      order: 10,
    },
    permissions: ["analytics.view"],
  },

  customers: {
    id: "customers",
    label: "Customers",
    description: "Customer table and customer records.",
    navigation: {
      group: "operate",
      label: "Customers",
      icon: "customers",
      href: "/customers",
      order: 20,
    },
    permissions: ["customers.view", "customers.edit"],
  },

  media: {
    id: "media",
    label: "Media Library",
    description: "File grid with usage tracking and orphan flagging.",
    navigation: {
      group: "configure",
      label: "Media",
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
    label: "Settings",
    description: "Workspace settings: appearance & brand (more tabs later).",
    navigation: {
      group: "settings",
      label: "Settings",
      icon: "settings",
      href: "/settings/appearance",
      order: 0,
      children: [
        { label: "Appearance & brand", href: "/settings/appearance" },
        { label: "Team & permissions", href: "/settings/team" },
      ],
    },
    permissions: ["settings.view", "settings.manage"],
  },
} satisfies Partial<Record<ModuleId, ModuleDefinition>>

/** Modules that have a definition. Config may list more ids than are registered yet. */
export type RegisteredModuleId = keyof typeof moduleRegistry
