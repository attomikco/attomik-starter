/**
 * Locales the starter ships chrome copy for. A project picks one in
 * `src/config/project.ts` (`locale`); adding a locale means adding a
 * dictionary file next to this one and registering it in index.ts.
 * Dependency-free so the config file can import the type.
 */
export const LOCALES = ["en", "es-MX"] as const

export type Locale = (typeof LOCALES)[number]

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}
