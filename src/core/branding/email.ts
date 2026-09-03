import { resolveSkin } from "./derive.ts"
import type { SkinInput, ThemeMode } from "./types.ts"

/**
 * Email-safe brand values — the documented exception to token-driven color
 * (reference §6): mail clients strip custom properties, and many strip
 * oklch() functions outright, so colours must be LITERAL HEX resolved from
 * the same skin at send time. This module parses the engine's own resolved
 * tokens (never re-deriving them) and converts oklch → sRGB hex.
 *
 * Only the accent pair travels into email; the neutral greys stay the
 * reference's hand-tuned email palette (accent discipline: signal only).
 */

/** "#rrggbb" for a resolved CSS color: passes hex through, converts oklch. */
export function cssColorToHex(color: string): string {
  const trimmed = color.trim()
  if (trimmed.startsWith("#")) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed.slice(0, 7)
  }
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(trimmed)
  if (!m) throw new Error(`cssColorToHex: unsupported color "${color}"`)
  return oklchToHex(Number(m[1]), Number(m[2]), Number(m[3]))
}

/** oklch → sRGB hex (standard OKLab → LMS → linear sRGB → gamma, clamped). */
export function oklchToHex(l: number, c: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  const toByte = (linear: number) => {
    const clamped = Math.min(1, Math.max(0, linear))
    const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, srgb)) * 255)
  }
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const bb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_

  return "#" + [r, g, bb].map((ch) => toByte(ch).toString(16).padStart(2, "0")).join("")
}

/**
 * The workspace accent as email-ready hex. Emails inline the LIGHT palette
 * and carry the dark one in a prefers-color-scheme block, so both themes
 * are resolved from the same skin — pass "dark" for the override pair.
 */
export function emailBrand(skin: SkinInput, mode: ThemeMode = "light"): { accent: string; accentInk: string } {
  const tokens = resolveSkin(skin, mode)
  return {
    accent: cssColorToHex(tokens["--accent"]),
    accentInk: cssColorToHex(tokens["--accent-ink"]),
  }
}
