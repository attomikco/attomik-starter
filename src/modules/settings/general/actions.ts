"use server"

import { revalidatePath } from "next/cache"
import { isLocale } from "@/core/i18n"
import { getT } from "@/core/i18n/server"
import { logDbFailure } from "@/core/supabase/diagnostics"
import { createClient } from "@/core/supabase/server"
import { requireWorkspace } from "@/core/workspace"
import { settingsCopy } from "../copy"

/**
 * General workspace settings: identity and regional defaults that are not
 * visual brand controls. Owner/admin only (re-checked by RLS on
 * workspace_settings). Partial input: only the fields sent are written.
 */

export interface SaveGeneralInput {
  displayName?: string
  defaultLocale?: string
}

export interface GeneralActionResult {
  ok: boolean
  message?: string
}

export async function saveGeneral(input: SaveGeneralInput): Promise<GeneralActionResult> {
  const t = await getT(settingsCopy)
  const ctx = await requireWorkspace()
  if (ctx.workspace.role !== "owner" && ctx.workspace.role !== "admin") {
    return { ok: false, message: t("settings.general.error.notAdmin") }
  }

  const patch: Record<string, string> = {}
  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim()
    if (!displayName) return { ok: false, message: t("settings.general.error.nameRequired") }
    if (displayName.length > 80) return { ok: false, message: t("settings.general.error.nameTooLong") }
    patch.display_name = displayName
  }
  if (input.defaultLocale !== undefined) {
    if (!isLocale(input.defaultLocale)) return { ok: false, message: t("settings.general.error.invalidLocale") }
    patch.default_locale = input.defaultLocale
  }
  if (Object.keys(patch).length === 0) return { ok: true }

  // Read the row back: RLS filters a forbidden update to zero rows without
  // raising, so a save only counts when the row comes back with the value.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspace.id)
    .select("workspace_id")
  if (error || !data?.length) {
    logDbFailure("settings.general", error, `workspace ${ctx.workspace.id.slice(0, 8)}… as ${ctx.workspace.role}`)
    return { ok: false, message: t("settings.general.error.saveFailed") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}
