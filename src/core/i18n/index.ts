// Relative .ts imports keep this module runnable under `node --test`
// (no path-alias resolution there); Next resolves them the same way.
import { projectConfig } from "../../config/project.ts"
import type { ShellCopy } from "./copy.ts"
import { en } from "./en.ts"
import { esMX } from "./es-MX.ts"
import type { Locale } from "./locales.ts"

/**
 * Shell chrome copy, keyed by the project locale. ONE source of truth:
 * `projectConfig.locale` → `copy`. Shell, data primitives, app-level
 * error states and the audit summarizer read from here; nothing in those
 * layers hardcodes a user-facing string. The config is static per project,
 * so `copy` is safe to import from server and client components alike.
 */

export type { AuditCopy, ShellCopy } from "./copy.ts"
export { LOCALES, isLocale, type Locale } from "./locales.ts"

const DICTIONARIES: Record<Locale, ShellCopy> = {
  en,
  "es-MX": esMX,
}

export function resolveCopy(locale: Locale): ShellCopy {
  return DICTIONARIES[locale]
}

/** The active project locale. */
export const locale: Locale = projectConfig.locale

/** The active dictionary. */
export const copy: ShellCopy = resolveCopy(locale)
