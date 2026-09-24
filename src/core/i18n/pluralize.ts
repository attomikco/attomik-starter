/**
 * The one plural path (docs/UI_STANDARDS.md, Copy). Built on Intl.PluralRules,
 * so it takes either dictionary values or literal Spanish strings — a single
 * mechanism for the shell copy and for the Matpro modules that hard-code
 * Spanish. Pure and relative-import free, so it runs under `node --test`.
 */

export interface PluralForms {
  one: string
  other: string
}

const rules = new Map<string, Intl.PluralRules>()

function rulesFor(locale: string): Intl.PluralRules {
  let pr = rules.get(locale)
  if (!pr) {
    pr = new Intl.PluralRules(locale)
    rules.set(locale, pr)
  }
  return pr
}

/** The form for `n`: "evento" for 1, "eventos" for 0, 2, 1.5 … (es-MX rules by default). */
export function pluralize(n: number, forms: PluralForms, locale = "es-MX"): string {
  return rulesFor(locale).select(n) === "one" ? forms.one : forms.other
}

/** "3 eventos" — the formatted count and its form, so a count never reads "1 eventos". */
export function countOf(n: number, forms: PluralForms, format: (n: number) => string = (v) => String(v), locale = "es-MX"): string {
  return `${format(n)} ${pluralize(n, forms, locale)}`
}
