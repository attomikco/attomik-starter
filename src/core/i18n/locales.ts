/**
 * Locales the starter ships copy for. A project picks its default in
 * `src/config/project.ts` (`locale`); users override it per profile, and
 * a workspace carries a default for new members and pre-auth screens.
 * Adding a locale means a dictionary file next to `en.ts`, registered in
 * index.ts, plus a name here. Dependency-free so config can import the type.
 */
export const LOCALES = ["en", "es-MX"] as const

export type Locale = (typeof LOCALES)[number]

/** Each locale's own name, as shown in the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  "es-MX": "Español",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}
