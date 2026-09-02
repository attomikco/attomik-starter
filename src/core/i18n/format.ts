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

/**
 * The zones a workspace would actually pick: the Americas and Europe,
 * one representative city per offset region, plus UTC. Validation
 * (`isTimeZone`) still accepts any IANA id, so a value set elsewhere
 * keeps working and shows up in the picker.
 */
export const TIME_ZONE_CHOICES: readonly string[] = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Vancouver",
  "America/Mexico_City", "America/Monterrey", "America/Cancun", "America/Tijuana",
  "America/Bogota", "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires", "America/Sao_Paulo",
  "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam",
  "Europe/Rome", "Europe/Zurich", "Europe/Stockholm", "Europe/Warsaw", "Europe/Athens",
  "UTC",
]

/** Picker rows: the curated list (plus `current` if it is not in it), labelled "City · UTC−5". */
export function listTimeZones(current?: string): { value: string; label: string }[] {
  const ids = current && !TIME_ZONE_CHOICES.includes(current) ? [current, ...TIME_ZONE_CHOICES] : [...TIME_ZONE_CHOICES]
  return ids.map((id) => ({ value: id, label: `${timeZoneCity(id)} · ${utcOffsetLabel(id)}` }))
}

function timeZoneCity(id: string): string {
  if (id === "UTC") return "UTC"
  return id.slice(id.lastIndexOf("/") + 1).replace(/_/g, " ")
}

/** "UTC−5" / "UTC+1" / "UTC+5:30" for the zone right now (DST-aware). */
export function utcOffsetLabel(id: string, at: Date = new Date()): string {
  const part = new Intl.DateTimeFormat("en", { timeZone: id, timeZoneName: "longOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT"
  const raw = part.replace("GMT", "")
  const [h, m] = raw.slice(1).split(":")
  if (!raw || (Number(h) === 0 && (!m || m === "00"))) return "UTC"
  const sign = raw[0] === "-" ? "−" : "+"
  return `UTC${sign}${Number(h)}${m && m !== "00" ? `:${m}` : ""}`
}

/** True when Intl accepts the zone (canonical IANA id). */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false
  try {
    new Intl.DateTimeFormat("en", { timeZone: value })
    return true
  } catch {
    return false
  }
}

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
