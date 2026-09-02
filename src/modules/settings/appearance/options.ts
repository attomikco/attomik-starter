/**
 * Brand input option lists, verbatim from the reference `skinPickers()`
 * and preset definitions in design-reference/part-settings.dc.html.
 */

export const FONT_OPTIONS: string[] = [
  "Instrument Sans",
  "Figtree",
  "Plus Jakarta Sans",
  "DM Sans",
  "Manrope",
  "Barlow",
  "Space Grotesk",
  "Outfit",
  "Sora",
  "Work Sans",
  "Poppins",
]

export const MONO_OPTIONS: string[] = [
  "IBM Plex Mono",
  "DM Mono",
  "JetBrains Mono",
  "Space Mono",
  "Azeret Mono",
]

export const WEIGHT_BOLD_OPTIONS: number[] = [600, 700, 800, 900]
export const WEIGHT_SEMI_OPTIONS: number[] = [400, 500, 600, 700]

/** Reference `skinPresets()` patches (Poppins added for the green preset). Hints live in the settings copy under `settings.appearance.preset.<id>.hint`. */
export const PRESET_PATCHES = [
  {
    id: "base", label: "Base", dot: "oklch(.52 .16 250)",
    patch: { ah: 250, ac: 0.16, nh: 250, nc: 0.006, sc: 0.15, font: "Instrument Sans", mono: "IBM Plex Mono", wb: 700, ws: 600, al: 0.52, alDark: 0.66, ink: undefined },
  },
  {
    id: "electric", label: "Electric", dot: "oklch(.86 .21 160)",
    patch: { ah: 160, ac: 0.21, nh: 160, nc: 0.004, sc: 0.15, font: "Barlow", mono: "DM Mono", wb: 800, ws: 600, al: 0.86, alDark: 0.88, ink: 0.16 },
  },
  {
    id: "green", label: "Green", dot: "oklch(.58 .09 140)",
    patch: { ah: 140, ac: 0.09, nh: 138, nc: 0.009, sc: 0.13, font: "Poppins", mono: "IBM Plex Mono", wb: 600, ws: 500, al: 0.58, alDark: 0.72, ink: undefined },
  },
] as const
