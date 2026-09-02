import { oklchToHex } from "./email.ts"

/**
 * Colour utilities for seed intake and contrast checks. The engine itself
 * is seeded with OKLCH hue/chroma (see types.ts); brands hand over hex, so
 * this is where "#2F4FD0" becomes { l, c, h }. Pure functions, no DOM.
 */

export interface Oklch {
  l: number
  c: number
  h: number
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Normalizes "#abc" / "abc" / "#aabbcc" to "#aabbcc"; null when malformed. */
export function normalizeHex(value: string): string | null {
  const m = HEX_RE.exec(value.trim())
  if (!m) return null
  const raw = m[1].toLowerCase()
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw
  return "#" + full
}

function srgbToLinear(byte: number): number {
  const c = byte / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function hexToLinearRgb(hex: string): [number, number, number] {
  const full = normalizeHex(hex)
  if (!full) throw new Error(`hexToLinearRgb: malformed hex "${hex}"`)
  return [
    srgbToLinear(parseInt(full.slice(1, 3), 16)),
    srgbToLinear(parseInt(full.slice(3, 5), 16)),
    srgbToLinear(parseInt(full.slice(5, 7), 16)),
  ]
}

/** sRGB hex → OKLCH (standard linear sRGB → LMS → OKLab → polar). */
export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinearRgb(hex)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360
  // A true grey has no hue; report 0 rather than atan2 noise.
  return { l: L, c, h: c < 0.0005 ? 0 : h }
}

/** WCAG relative luminance of an sRGB hex. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio (1–21) between two colours. Accepts hex or the
    engine's opaque oklch() strings; alpha tints are not resolvable here. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(toHex(a))
  const lb = relativeLuminance(toHex(b))
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function toHex(color: string): string {
  const trimmed = color.trim()
  if (trimmed.startsWith("#")) return trimmed
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(trimmed)
  if (!m) throw new Error(`contrastRatio: unsupported colour "${color}"`)
  return oklchToHex(Number(m[1]), Number(m[2]), Number(m[3]))
}
