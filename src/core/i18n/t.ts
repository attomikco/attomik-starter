import type { Locale } from "./locales.ts"

/**
 * String-key copy for modules. A module declares one flat dictionary per
 * locale — keys are English dotted identifiers prefixed with the module id
 * (`settings.team.invite`), values are the locale's sentences — and its
 * components call `t("settings.team.invite")`; a literal never reaches a
 * component. English is the source locale and the fallback.
 *
 * Interpolation uses `{name}` placeholders. Plurals are two keys,
 * `<key>.one` / `<key>.other`, picked by `t.n(key, n)` with `{n}` set.
 *
 * A missing key returns the key itself and warns (once per key) outside
 * production, so a typo shows up on screen in development instead of
 * silently blanking.
 *
 * Translators are bound to a locale: `defineCopy()` in a module's copy.ts
 * gives a `ModuleCopy`, and `useT(copy)` (client) / `getT(copy)` (server)
 * hand components the translator for the active user's locale.
 */

export type Dictionary = Readonly<Record<string, string>>
export type CopyParams = Record<string, string | number>
export type Dictionaries = { en: Dictionary } & Partial<Record<Locale, Dictionary>>

export interface Translator {
  (key: string, params?: CopyParams): string
  /** Plural helper: resolves `${key}.one` or `${key}.other` with `{n}` set. */
  n: (key: string, n: number, params?: CopyParams) => string
  /** The locale this translator renders. */
  locale: Locale
  /** Keys the active dictionary knows — for parity checks in tests. */
  keys: () => string[]
}

export interface ModuleCopy {
  for: (locale: Locale) => Translator
  /** The dictionaries as declared, so tests can check locale parity. */
  dictionaries: Dictionaries
}

const warned = new Set<string>()

export function interpolate(raw: string, params?: CopyParams): string {
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

export function createTranslator(dictionaries: Dictionaries, locale: Locale): Translator {
  const active: Dictionary = dictionaries[locale] ?? dictionaries.en
  const fallback: Dictionary = dictionaries.en
  const t = ((key: string, params?: CopyParams) => {
    const raw = active[key] ?? fallback[key]
    if (raw === undefined) {
      if (process.env.NODE_ENV !== "production" && !warned.has(key)) {
        warned.add(key)
        console.warn(`[i18n] missing copy key: ${key}`)
      }
      return key
    }
    return interpolate(raw, params)
  }) as Translator
  t.n = (key, n, params) => t(n === 1 ? `${key}.one` : `${key}.other`, { n, ...params })
  t.locale = locale
  t.keys = () => Object.keys(active)
  return t
}

/** A module's copy: declared once, bound to a locale per render. */
export function defineCopy(dictionaries: Dictionaries): ModuleCopy {
  const bound = new Map<Locale, Translator>()
  return {
    dictionaries,
    for(locale) {
      let t = bound.get(locale)
      if (!t) {
        t = createTranslator(dictionaries, locale)
        bound.set(locale, t)
      }
      return t
    },
  }
}

/** Test hook: forget which keys already warned. */
export function resetMissingKeyWarnings(): void {
  warned.clear()
}
