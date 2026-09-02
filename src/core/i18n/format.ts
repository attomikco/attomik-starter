import type { Locale } from "./locales.ts"

/**
 * Date and number formatting for the active locale, through Intl. One
 * place decides the shapes ("2 Sep 2026", "14:05", "1,234"); components
 * never call toLocaleString themselves. Formatters are cached per locale +
 * time zone, since Intl constructors are expensive.
 */

export interface Formatters {
  locale: Locale
  /** "2 Sep 2026" */
  date: (value: string | Date) => string
  /** "2 Sep 2026, 14:05" */
  dateTime: (value: string | Date) => string
  /** "14:05" */
  time: (value: string | Date) => string
  /** "1,234" / "1.234,5" — the locale's grouping and decimals. */
  number: (value: number, options?: Intl.NumberFormatOptions) => string
  /** Whole days between two instants, in the formatter's time zone. */
  daysBetween: (from: string | Date, to: string | Date) => number
}

const cache = new Map<string, Formatters>()

export function createFormatters(locale: Locale, timeZone?: string): Formatters {
  const key = `${locale}|${timeZone ?? ""}`
  const hit = cache.get(key)
  if (hit) return hit

  const tz = timeZone ? { timeZone } : {}
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", ...tz })
  const dateTime = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, ...tz })
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, ...tz })
  const numbers = new Map<string, Intl.NumberFormat>()
  const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v))

  const f: Formatters = {
    locale,
    date: (v) => date.format(toDate(v)),
    dateTime: (v) => dateTime.format(toDate(v)),
    time: (v) => time.format(toDate(v)),
    number: (v, options) => {
      const k = JSON.stringify(options ?? {})
      let nf = numbers.get(k)
      if (!nf) {
        nf = new Intl.NumberFormat(locale, options)
        numbers.set(k, nf)
      }
      return nf.format(v)
    },
    daysBetween: (from, to) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000),
  }
  cache.set(key, f)
  return f
}
