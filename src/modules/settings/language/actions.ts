"use server"

import { revalidatePath } from "next/cache"
import { isLocale } from "@/core/i18n"
import { getT } from "@/core/i18n/server"
import { createClient } from "@/core/supabase/server"
import { requireWorkspace } from "@/core/workspace"
import { settingsCopy } from "../copy"

/**
 * Language actions. The user's own locale lives on their profile (RLS:
 * own row only); the workspace default on workspace_settings (owner/admin,
 * enforced again by RLS). Both revalidate the whole layout so the next
 * render — <html lang>, navigation, every dictionary read — is already in
 * the new language.
 */

export interface LanguageActionResult {
  ok: boolean
  message?: string
}

/** `null` clears the preference: the workspace default applies again. */
export async function saveUserLocale(locale: string | null): Promise<LanguageActionResult> {
  const t = await getT(settingsCopy)
  const ctx = await requireWorkspace()
  if (locale !== null && !isLocale(locale)) return { ok: false, message: t("settings.language.error.invalid") }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ locale, updated_at: new Date().toISOString() })
    .eq("id", ctx.user.id)
  if (error) {
    console.error("[language] profile save failed:", error.code)
    return { ok: false, message: t("settings.language.error.saveFailed") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function saveWorkspaceLocale(locale: string): Promise<LanguageActionResult> {
  const t = await getT(settingsCopy)
  const ctx = await requireWorkspace()
  if (ctx.workspace.role !== "owner" && ctx.workspace.role !== "admin") {
    return { ok: false, message: t("settings.language.error.notAdmin") }
  }
  if (!isLocale(locale)) return { ok: false, message: t("settings.language.error.invalid") }

  const supabase = await createClient()
  const { error } = await supabase
    .from("workspace_settings")
    .update({ default_locale: locale, updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspace.id)
  if (error) {
    console.error("[language] workspace save failed:", error.code)
    return { ok: false, message: t("settings.language.error.saveFailed") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}
