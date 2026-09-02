// Relative .ts imports keep this module runnable under `node --test`
// (no path-alias resolution there); Next resolves them the same way.
import { projectConfig } from "../../config/project.ts"
import type { ShellCopy } from "./copy.ts"
import { en } from "./en.ts"
import { esMX } from "./es-MX.ts"
import { isLocale, type Locale } from "./locales.ts"

/**
 * The i18n core. ONE system, three layers:
 *
 * - The shell dictionary (`ShellCopy`, typed, nested): chrome, data
 *   primitives, auth, errors, audit summaries, email. `resolveCopy(locale)`.
 * - Module copy (`defineCopy`, flat dotted keys) in each module's copy.ts.
 * - Formatters (`createFormatters`) for dates and numbers.
 *
 * The ACTIVE locale is per user: resolved server-side once per request
 * (`getLocale()` in ./server) — profile → workspace default → project
 * default — rendered on <html lang>, and handed to client components
 * through `LocaleProvider` (./client). Components read copy through
 * `useCopy()` / `useT()` / `useFormat()` on the client and `getCopy()` /
 * `getT()` / `getFormat()` on the server. Nothing imports a fixed locale.
 */

export type { AuditCopy, ShellCopy } from "./copy.ts"
export { LOCALES, LOCALE_NAMES, isLocale, type Locale } from "./locales.ts"
export { createTranslator, defineCopy, interpolate, type CopyParams, type Dictionaries, type Dictionary, type ModuleCopy, type Translator } from "./t.ts"
export { createFormatters, type Formatters } from "./format.ts"

const DICTIONARIES: Record<Locale, ShellCopy> = {
  en,
  "es-MX": esMX,
}

export function resolveCopy(locale: Locale): ShellCopy {
  return DICTIONARIES[locale]
}

/** The project's default locale: the last fallback in the chain. */
export const defaultLocale: Locale = projectConfig.locale

/** The chain: the first valid candidate wins, else the project default. */
export function pickLocale(...candidates: (string | null | undefined)[]): Locale {
  for (const c of candidates) if (isLocale(c)) return c
  return defaultLocale
}
