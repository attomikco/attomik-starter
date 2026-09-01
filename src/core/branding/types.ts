/**
 * Skin input model, matching the reference implementation's keys exactly
 * (design-reference/Starter Admin.dc.html, `SKINS` / `tokens()`).
 * Short names are kept deliberately so reference presets map one-to-one.
 */
export interface SkinInput {
  /** Accent hue, 0–360 */
  ah: number
  /** Accent chroma, 0–0.28 — how loud the brand colour may be */
  ac: number
  /** Neutral hue, 0–360 — which way the greys lean */
  nh: number
  /** Neutral chroma, 0–0.02 — how far from true grey */
  nc: number
  /** Semantic chroma, 0.06–0.24 — intensity of green, amber, red */
  sc: number
  /** Display and body face */
  font: string
  /** Numeral face */
  mono: string
  /** Bold emphasis weight, 400–900 */
  wb: number
  /** Semibold emphasis weight, 400–900 */
  ws: number
  /** Optional: accent fill lightness in light theme (bright-fill brands). Default 0.52 */
  al?: number
  /** Optional: accent fill lightness in dark theme. Default 0.66 */
  alDark?: number
  /** Optional: lightness of ink sitting on the accent fill. Default near-white light / near-black dark */
  ink?: number
}

/**
 * Product geometry. Lives alongside the skin in the reference object
 * (`skinOf()` merges { r: 22, r2: 16, r3: 11 }) but is PRODUCT configuration,
 * not client branding: a project may set it once, a client may not.
 */
export interface ProductGeometry {
  r: number
  r2: number
  r3: number
}

export type ThemeMode = "light" | "dark"

/** Resolved CSS custom properties, keyed by variable name including `--`. */
export type SkinTokens = Record<string, string>
