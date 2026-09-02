import { hexToOklch, normalizeHex, contrastRatio } from "./color.ts"
import { resolveSkin } from "./derive.ts"
import { oklchToHex } from "./email.ts"
import type { SkinInput, ThemeMode } from "./types.ts"

/**
 * Seed intake: the two colours a brand actually hands over, mapped onto the
 * engine's inputs the same way the shipped presets were hand-seeded.
 *
 *   accent hex → ah (hue), ac (chroma), al (fill lightness), ink
 *   neutral hex → nh (hue), nc (chroma)
 *
 * Everything else (surfaces, text steps, chart ramp, semantics, dark
 * theme) stays derived. Fonts, weights, and semantic chroma are carried
 * over from the current skin — the seeds do not touch them.
 */

export interface SkinSeeds {
  /** Brand primary, e.g. "#2F4FD0". */
  accent: string
  /** A brand grey, e.g. "#6B7280" — read for hue direction and tint. */
  neutral: string
}

const round = (v: number, places: number) => Number(v.toFixed(places))

/** Lightness above which near-white ink stops reading on the fill. */
const DARK_INK_THRESHOLD = 0.6

export function seedsToSkinInput(seeds: SkinSeeds, current: SkinInput): SkinInput {
  const accentHex = normalizeHex(seeds.accent)
  const neutralHex = normalizeHex(seeds.neutral)
  if (!accentHex || !neutralHex) throw new Error("seedsToSkinInput: malformed hex seed")
  const a = hexToOklch(accentHex)
  const n = hexToOklch(neutralHex)

  const al = round(Math.min(0.9, Math.max(0.2, a.l)), 2)
  const next: SkinInput = {
    ...current,
    ah: Math.round(a.h),
    ac: round(Math.min(0.28, a.c), 3),
    al,
    nh: Math.round(n.h),
    nc: round(Math.min(0.02, n.c), 3),
  }
  // Bright fills keep their own lightness on dark grounds (as `electric`
  // does); darker accents fall back to the engine default by omission.
  delete next.alDark
  if (al > 0.66) next.alDark = al
  // Ink: the engine's near-white default, or the reference's dark ink
  // (.16, as `electric` states it) once the fill is too bright for white.
  delete next.ink
  if (al >= DARK_INK_THRESHOLD) next.ink = 0.16
  return next
}

/** The seeds a skin was (or could have been) built from, for editing. */
export function skinToSeeds(skin: SkinInput): SkinSeeds {
  return {
    accent: oklchToHex(skin.al ?? 0.52, skin.ac, skin.ah),
    // A mid-grey at the neutral's own tint (the lightness of a typical brand grey).
    neutral: oklchToHex(0.656, skin.nc, skin.nh),
  }
}

export type ContrastPair = "inkOnAccent" | "accentTextOnCard"

export interface ContrastIssue {
  mode: ThemeMode
  /** Which pair failed — the UI names it in the active locale. */
  pair: ContrastPair
  ratio: number
  minimum: number
}

/**
 * The accent pairs a seed choice can break, checked in both themes against
 * WCAG AA for text (4.5). Surfaces, text steps, and semantics are placed by
 * the engine at fixed lightness and cannot fail from seeds alone.
 */
export function brandContrastIssues(skin: SkinInput): ContrastIssue[] {
  const issues: ContrastIssue[] = []
  for (const mode of ["light", "dark"] as const) {
    const t = resolveSkin(skin, mode)
    // Text pairs only: a bright fill sitting low-contrast on the card is a
    // legitimate brand choice (`electric` ships that way) — its ink is what
    // must read.
    const checks: [ContrastPair, string, string, number][] = [
      ["inkOnAccent", "--accent-ink", "--accent", 4.5],
      ["accentTextOnCard", "--accent-text", "--card", 4.5],
    ]
    for (const [pair, fg, bg, minimum] of checks) {
      const ratio = contrastRatio(t[fg], t[bg])
      if (ratio < minimum) issues.push({ mode, pair, ratio: round(ratio, 2), minimum })
    }
  }
  return issues
}
