/**
 * Email palettes — the documented exception to token-driven colour
 * (design-reference README §6, Starter Emails). Mail clients strip custom
 * properties and many strip oklch() outright, so every value an email
 * renders must be LITERAL HEX. These two palettes are the reference's
 * hand-tuned email neutrals; only the accent pair is replaced per
 * workspace, resolved from the same skin the product uses
 * (`emailBrand()` in core/branding).
 *
 * Light and dark are peers, exactly as in the product: the dark palette is
 * redrawn, never an inversion of the light one.
 *
 * Pure module, relative .ts imports — runnable from node scripts.
 */

export interface EmailPalette {
  ground: string
  card: string
  inset: string
  line: string
  ink: string
  ink2: string
  meta: string
  accent: string
  accentInk: string
  accentTint: string
  ok: string
  okTint: string
  bad: string
  badTint: string
  warn: string
  warnTint: string
}

export const LIGHT_EMAIL_PALETTE: EmailPalette = {
  ground: "#eef0f3", card: "#ffffff", inset: "#f5f6f8", line: "#e3e6ea",
  ink: "#0e1013", ink2: "#4c5158", meta: "#7b8188",
  accent: "#2f4fd0", accentInk: "#ffffff", accentTint: "#eaeefb",
  ok: "#2f7d52", okTint: "#e8f3ec",
  bad: "#c0392b", badTint: "#fbecea",
  warn: "#9a6a17", warnTint: "#fbf1de",
}

export const DARK_EMAIL_PALETTE: EmailPalette = {
  ground: "#14171b", card: "#1c1f24", inset: "#23272d", line: "#2b3037",
  ink: "#f2f3f5", ink2: "#aab1ba", meta: "#79818b",
  accent: "#5b7cff", accentInk: "#0d0f12", accentTint: "#1d2440",
  ok: "#63d69b", okTint: "#16301f",
  bad: "#f08175", badTint: "#361b19",
  warn: "#e6b45c", warnTint: "#33270f",
}

/** The workspace accent, per theme, as literal hex. */
export interface EmailBrandPair {
  light: { accent: string; accentInk: string }
  dark: { accent: string; accentInk: string }
}

/**
 * The two palettes an email ships with: reference neutrals, workspace
 * accent. Accent discipline holds in email too — the brand colour is
 * signal (one button, one link), never a background wash.
 */
export function emailPalettes(brand?: Partial<EmailBrandPair>): { light: EmailPalette; dark: EmailPalette } {
  return {
    light: { ...LIGHT_EMAIL_PALETTE, ...(brand?.light ?? {}) },
    dark: { ...DARK_EMAIL_PALETTE, ...(brand?.dark ?? {}) },
  }
}
