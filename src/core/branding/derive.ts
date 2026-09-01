import type { ProductGeometry, SkinInput, SkinTokens, ThemeMode } from "./types"

/**
 * The canonical OKLCH skin derivation — a direct port of `tokens()` from
 * design-reference/Starter Admin.dc.html (the host copy, which is the
 * authoritative one: it alone handles al/alDark/ink for bright-fill brands).
 * Every lightness, multiplier, alpha, and hue below matches the reference;
 * do not adjust them here without changing the reference first.
 */

export const DEFAULT_GEOMETRY: ProductGeometry = { r: 22, r2: 16, r3: 11 }

/** Reference `ok3()`: lightness raw, chroma toFixed(3), optional alpha. */
function ok3(l: number, c: number, h: number, a?: string): string {
  return "oklch(" + l + " " + c.toFixed(3) + " " + h + (a ? " / " + a : "") + ")"
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Clamps inputs to the documented brand ranges (README §2.1). The reference
 * prototype trusts its own presets and does not validate; the production
 * engine clamps so persisted workspace branding can never produce an
 * out-of-gamut palette. Valid input passes through unchanged.
 */
export function clampSkinInput(input: SkinInput): SkinInput {
  return {
    ...input,
    ah: clamp(input.ah, 0, 360),
    ac: clamp(input.ac, 0, 0.28),
    nh: clamp(input.nh, 0, 360),
    nc: clamp(input.nc, 0, 0.02),
    sc: clamp(input.sc, 0.06, 0.24),
    wb: clamp(input.wb, 400, 900),
    ws: clamp(input.ws, 400, 900),
    ...(input.al !== undefined ? { al: clamp(input.al, 0, 1) } : {}),
    ...(input.alDark !== undefined ? { alDark: clamp(input.alDark, 0, 1) } : {}),
    ...(input.ink !== undefined ? { ink: clamp(input.ink, 0, 1) } : {}),
  }
}

export function resolveSkin(
  input: SkinInput,
  mode: ThemeMode,
  geometry: ProductGeometry = DEFAULT_GEOMETRY,
): SkinTokens {
  const s = clampSkinInput(input)
  const dark = mode === "dark"

  const n = (l: number, m?: number) => ok3(l, s.nc * (m ?? 1), s.nh)
  const acc = (l: number, m?: number, a?: string) => ok3(l, s.ac * (m ?? 1), s.ah, a)
  const sem = (l: number, m: number, h: number, a?: string) => ok3(l, s.sc * m, h, a)

  const surfaces: SkinTokens = dark
    ? { "--bg": n(0.155, 1.2), "--shell": n(0.19, 1.2), "--card": n(0.225, 1.3), "--line": n(0.285, 1.6), "--line-2": n(0.35, 1.8),
        "--txt": n(0.96, 0.4), "--txt-2": n(0.74, 1.2), "--txt-3": n(0.60, 1.2), "--txt-4": n(0.48, 1.2) }
    : { "--bg": n(0.918, 1), "--shell": n(0.977, 0.8), "--card": n(0.998, 0.3), "--line": n(0.895, 1.2), "--line-2": n(0.82, 1.4),
        "--txt": n(0.17, 1.6), "--txt-2": n(0.43, 1.4), "--txt-3": n(0.59, 1.2), "--txt-4": n(0.71, 1) }

  // A brand whose accent is a bright fill (Attomik's green) states its own
  // lightness and the ink that sits on it; readable text is still derived.
  const fillL = dark ? (s.alDark ?? 0.66) : (s.al ?? 0.52)
  const inkOnFill = s.ink !== undefined ? n(s.ink, 1) : dark ? n(0.14, 1) : n(0.99, 0.2)
  const accent: SkinTokens = dark
    ? { "--accent": acc(fillL), "--accent-ink": inkOnFill, "--accent-text": acc(0.80, 0.8), "--accent-tint": acc(0.80, 0.8, ".16"),
        "--lead": acc(0.34, 0.55), "--lead-line": acc(0.45, 0.7) }
    : { "--accent": acc(fillL), "--accent-ink": inkOnFill, "--accent-text": acc(0.44, 0.94), "--accent-tint": acc(0.44, 0.94, ".10"),
        "--lead": acc(0.965, 0.09), "--lead-line": acc(0.90, 0.26) }

  // Chart series: one hue, rank order, chroma tapering. Never categories.
  const steps = dark ? [0.40, 0.52, 0.64, 0.76, 0.86] : [0.34, 0.46, 0.58, 0.70, 0.82]
  const ratio = [0.81, 1, 0.88, 0.63, 0.38]
  const series: SkinTokens = {}
  steps.forEach((l, i) => { series["--s" + (i + 1)] = acc(l, ratio[i]) })

  // Semantic hues are fixed (147 green, 78 amber, 25 red; fills shift amber
  // slightly toward 88–92 exactly as the reference does). Chroma follows sc.
  const semantics: SkinTokens = dark
    ? { "--ok": sem(0.80, 1.15, 147), "--ok-fill": sem(0.70, 1.35, 147), "--ok-tint": sem(0.70, 1.35, 147, ".20"),
        "--warn": sem(0.86, 1.25, 88), "--warn-fill": sem(0.83, 1.35, 90), "--warn-tint": sem(0.83, 1.35, 90, ".20"),
        "--bad": sem(0.75, 1.3, 25), "--bad-fill": sem(0.66, 1.5, 25), "--bad-tint": sem(0.66, 1.5, 25, ".20") }
    : { "--ok": sem(0.575, 1.3, 147), "--ok-fill": sem(0.66, 1.35, 147), "--ok-tint": sem(0.66, 1.35, 147, ".14"),
        "--warn": sem(0.64, 1.15, 78), "--warn-fill": sem(0.83, 1.35, 92), "--warn-tint": sem(0.80, 1.3, 90, ".22"),
        "--bad": sem(0.575, 1.5, 25), "--bad-fill": sem(0.64, 1.55, 25), "--bad-tint": sem(0.64, 1.55, 25, ".14") }

  const hero: SkinTokens = {
    "--hero": accent["--lead"], "--hero-hair": accent["--lead-line"],
    "--hero-strong": surfaces["--txt"], "--hero-txt": surfaces["--txt-2"],
    "--hero-fill": dark ? surfaces["--line"] : surfaces["--card"],
    "--hero-mute": surfaces["--txt-4"], "--hero-accent": accent["--accent-text"],
  }

  return {
    ...surfaces,
    ...accent,
    ...series,
    ...semantics,
    ...hero,
    "--font": "'" + s.font + "', system-ui, sans-serif",
    "--mono": "'" + s.mono + "', ui-monospace, monospace",
    "--w-bold": String(s.wb),
    "--w-semi": String(s.ws),
    "--r": geometry.r + "px",
    "--r2": geometry.r2 + "px",
    "--r3": geometry.r3 + "px",
  }
}
