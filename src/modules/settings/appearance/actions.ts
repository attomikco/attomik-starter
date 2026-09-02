"use server"

import { revalidatePath } from "next/cache"
import {
  clampSkinInput,
  geometryToRow,
  skinInputToRow,
  type DefaultAppearance,
  type ProductGeometry,
  type SkinInput,
} from "@/core/branding"
import { createClient } from "@/core/supabase/server"
import { getT } from "@/core/i18n/server"
import { requireWorkspace } from "@/core/workspace"
import { settingsCopy } from "../copy"
import { FONT_OPTIONS, MONO_OPTIONS, WEIGHT_BOLD_OPTIONS, WEIGHT_SEMI_OPTIONS } from "./options"

/**
 * Appearance server actions. All writes go through here: validated
 * server-side, role-checked against workspace_members (RLS enforces the
 * same rules again at the database), and saved atomically — no partial
 * mixed saves. The UI never touches tables or storage directly.
 */

export interface SaveAppearanceInput {
  defaultAppearance: DefaultAppearance
  skin: SkinInput
  /** Interface geometry (radii) — ProductGeometry, persisted alongside brand. */
  geometry: ProductGeometry
}

export interface ActionResult {
  ok: boolean
  message?: string
}

async function requireAdminWorkspace() {
  const t = await getT(settingsCopy)
  const ctx = await requireWorkspace()
  if (ctx.workspace.role !== "owner" && ctx.workspace.role !== "admin") {
    return { ctx, error: t("settings.appearance.error.notAdmin") }
  }
  return { ctx, error: null }
}

export async function saveAppearance(input: SaveAppearanceInput): Promise<ActionResult> {
  const t = await getT(settingsCopy)
  const { ctx, error } = await requireAdminWorkspace()
  if (error) return { ok: false, message: error }

  if (!["light", "dark", "system"].includes(input.defaultAppearance)) {
    return { ok: false, message: t("settings.appearance.error.appearance") }
  }

  const s = input.skin
  const numbers = [s.ah, s.ac, s.nh, s.nc, s.sc, s.wb, s.ws, s.al, s.alDark, s.ink]
  if (numbers.some((n) => n !== undefined && !Number.isFinite(n))) {
    return { ok: false, message: t("settings.appearance.error.colorNaN") }
  }
  if (!FONT_OPTIONS.includes(s.font)) return { ok: false, message: t("settings.appearance.error.font") }
  if (!MONO_OPTIONS.includes(s.mono)) return { ok: false, message: t("settings.appearance.error.mono") }
  if (!WEIGHT_BOLD_OPTIONS.includes(s.wb)) return { ok: false, message: t("settings.appearance.error.bold") }
  if (!WEIGHT_SEMI_OPTIONS.includes(s.ws)) return { ok: false, message: t("settings.appearance.error.semibold") }

  const g = input.geometry
  for (const v of [g.r, g.r2, g.r3]) {
    if (!Number.isInteger(v) || v < 0 || v > 34) {
      return { ok: false, message: t("settings.appearance.error.radii") }
    }
  }

  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from("workspace_settings")
    .update({
      default_appearance: input.defaultAppearance,
      ...skinInputToRow(clampSkinInput(s)),
      ...geometryToRow(g),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", ctx.workspace.id)

  if (dbError) {
    console.error("[appearance] save failed:", dbError.code)
    return { ok: false, message: t("settings.appearance.error.saveFailed") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}

const ASSET_KINDS: Record<string, { column: string; accept: string[] }> = {
  "logo-light": { column: "logo_light_path", accept: ["image/svg+xml", "image/png", "image/webp", "image/jpeg"] },
  "logo-dark": { column: "logo_dark_path", accept: ["image/svg+xml", "image/png", "image/webp", "image/jpeg"] },
  favicon: { column: "favicon_path", accept: ["image/svg+xml", "image/png", "image/x-icon", "image/vnd.microsoft.icon"] },
}

export type BrandingAssetKind = "logo-light" | "logo-dark" | "favicon"

const EXTENSIONS: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
}

export async function uploadBrandingAsset(kind: BrandingAssetKind, formData: FormData): Promise<ActionResult> {
  const t = await getT(settingsCopy)
  const { ctx, error } = await requireAdminWorkspace()
  if (error) return { ok: false, message: error }

  const spec = ASSET_KINDS[kind]
  if (!spec) return { ok: false, message: t("settings.appearance.error.assetKind") }
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: t("settings.appearance.error.noFile") }
  if (!spec.accept.includes(file.type)) {
    return { ok: false, message: t("settings.appearance.error.format") }
  }
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: t("settings.appearance.error.tooLarge") }

  const path = `${ctx.workspace.id}/${kind}.${EXTENSIONS[file.type]}`
  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) {
    // Log the full Supabase Storage error server-side (status + name +
    // message identify RLS vs MIME vs size); the user gets a safe line.
    const detail = uploadError as { message: string; name?: string; status?: number; statusCode?: string }
    console.error(
      `[appearance] storage upload failed kind=${kind} path=${path}:`,
      detail.statusCode ?? detail.status ?? "?",
      detail.name ?? "",
      detail.message,
    )
    return { ok: false, message: t("settings.appearance.error.uploadFailed") }
  }

  const { error: dbError } = await supabase
    .from("workspace_settings")
    .update({ [spec.column]: path, updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspace.id)
  if (dbError) {
    console.error("[appearance] path save failed:", dbError.code)
    return { ok: false, message: t("settings.appearance.error.notLinked") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function removeBrandingAsset(kind: BrandingAssetKind): Promise<ActionResult> {
  const t = await getT(settingsCopy)
  const { ctx, error } = await requireAdminWorkspace()
  if (error) return { ok: false, message: error }

  const spec = ASSET_KINDS[kind]
  if (!spec) return { ok: false, message: t("settings.appearance.error.assetKind") }

  const supabase = await createClient()
  // Remove any extension variant of this asset, then unlink.
  const candidates = [...new Set(Object.values(EXTENSIONS))].map((ext) => `${ctx.workspace.id}/${kind}.${ext}`)
  await supabase.storage.from("branding").remove(candidates)

  const { error: dbError } = await supabase
    .from("workspace_settings")
    .update({ [spec.column]: null, updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspace.id)
  if (dbError) return { ok: false, message: t("settings.appearance.error.removeFailed") }

  revalidatePath("/", "layout")
  return { ok: true }
}
