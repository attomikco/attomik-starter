import type { SkinInput } from "./types"

/**
 * Shipped starter skins — values extracted verbatim from `SKINS` in
 * design-reference/Starter Admin.dc.html (identical copies live in each
 * part-*.dc.html file).
 */
export const skins = {
  base: {
    ah: 250, ac: 0.16, nh: 250, nc: 0.006, sc: 0.15,
    font: "Instrument Sans", mono: "IBM Plex Mono", wb: 700, ws: 600,
  },
  electric: {
    ah: 160, ac: 0.21, al: 0.86, alDark: 0.88, ink: 0.16, nh: 160, nc: 0.004, sc: 0.15,
    font: "Barlow", mono: "DM Mono", wb: 800, ws: 600,
  },
  green: {
    ah: 140, ac: 0.09, al: 0.58, alDark: 0.72, nh: 138, nc: 0.010, sc: 0.13,
    font: "Poppins", mono: "IBM Plex Mono", wb: 600, ws: 500,
  },
} satisfies Record<string, SkinInput>

export type SkinPresetId = keyof typeof skins

/** The project's default skin until persisted workspace branding exists. */
export const defaultSkin: SkinInput = skins.base
