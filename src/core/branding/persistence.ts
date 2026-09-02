import type { ProductGeometry, SkinInput } from "./types"

/**
 * Maps workspace_settings rows ↔ the canonical SkinInput. This is the ONLY
 * place database branding columns and the Task 003 engine meet. Resolved
 * CSS variables are never persisted; radii are product geometry, not brand.
 */

export type DefaultAppearance = "light" | "dark" | "system"

/** The brand columns of public.workspace_settings. */
export interface WorkspaceBrandRow {
  display_name: string
  radius_large: number
  radius_medium: number
  radius_small: number
  logo_light_path: string | null
  logo_dark_path: string | null
  favicon_path: string | null
  accent_hue: number
  accent_chroma: number
  neutral_hue: number
  neutral_chroma: number
  semantic_chroma: number
  font_family: string
  mono_font_family: string
  weight_bold: number
  weight_semibold: number
  accent_lightness: number | null
  accent_lightness_dark: number | null
  accent_ink_lightness: number | null
  default_appearance: DefaultAppearance
  /** Workspace default locale: new members and pre-auth screens. */
  default_locale: string
}

export function rowToSkinInput(row: WorkspaceBrandRow): SkinInput {
  return {
    ah: Number(row.accent_hue),
    ac: Number(row.accent_chroma),
    nh: Number(row.neutral_hue),
    nc: Number(row.neutral_chroma),
    sc: Number(row.semantic_chroma),
    font: row.font_family,
    mono: row.mono_font_family,
    wb: Number(row.weight_bold),
    ws: Number(row.weight_semibold),
    ...(row.accent_lightness !== null ? { al: Number(row.accent_lightness) } : {}),
    ...(row.accent_lightness_dark !== null ? { alDark: Number(row.accent_lightness_dark) } : {}),
    ...(row.accent_ink_lightness !== null ? { ink: Number(row.accent_ink_lightness) } : {}),
  }
}

/**
 * Interface geometry mapping — ProductGeometry, not brand:
 * radius_large → r (--r) · radius_medium → r2 (--r2) · radius_small → r3 (--r3)
 */
export function rowToGeometry(row: WorkspaceBrandRow): ProductGeometry {
  return {
    r: Number(row.radius_large),
    r2: Number(row.radius_medium),
    r3: Number(row.radius_small),
  }
}

export function geometryToRow(g: ProductGeometry): Pick<WorkspaceBrandRow, "radius_large" | "radius_medium" | "radius_small"> {
  return { radius_large: g.r, radius_medium: g.r2, radius_small: g.r3 }
}

export function skinInputToRow(input: SkinInput): Omit<
  WorkspaceBrandRow,
  | "display_name" | "logo_light_path" | "logo_dark_path" | "favicon_path"
  | "default_appearance" | "default_locale" | "radius_large" | "radius_medium" | "radius_small"
> {
  return {
    accent_hue: input.ah,
    accent_chroma: input.ac,
    neutral_hue: input.nh,
    neutral_chroma: input.nc,
    semantic_chroma: input.sc,
    font_family: input.font,
    mono_font_family: input.mono,
    weight_bold: input.wb,
    weight_semibold: input.ws,
    accent_lightness: input.al ?? null,
    accent_lightness_dark: input.alDark ?? null,
    accent_ink_lightness: input.ink ?? null,
  }
}
