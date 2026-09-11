"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/core/auth/require-user"
import { getSupabaseEnv } from "@/core/env"
import { getT } from "@/core/i18n/server"
import { logDbFailure } from "@/core/supabase/diagnostics"
import { createClient } from "@/core/supabase/server"
import { settingsCopy } from "../copy"

/**
 * Profile server actions: a person's own name and avatar. Own row only —
 * profiles RLS enforces `id = auth.uid()` regardless of workspace role, so
 * there is no admin gate here the way workspace settings has one.
 */

export interface ActionResult {
  ok: boolean
  message?: string
}

export async function saveDisplayName(displayName: string): Promise<ActionResult> {
  const t = await getT(settingsCopy)
  const user = await requireUser()

  const name = displayName.trim()
  if (name.length > 80) return { ok: false, message: t("settings.profile.error.nameTooLong") }

  const supabase = await createClient()
  const { error, data } = await supabase
    .from("profiles")
    .update({ display_name: name || null, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id")
  if (error || !data?.length) {
    logDbFailure("settings.profile", error, `user ${user.id.slice(0, 8)}…`)
    return { ok: false, message: t("settings.profile.error.saveFailed") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}

const ACCEPT = ["image/svg+xml", "image/png", "image/webp", "image/jpeg"]
const EXTENSIONS: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const t = await getT(settingsCopy)
  const user = await requireUser()

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: t("settings.profile.error.noFile") }
  if (!ACCEPT.includes(file.type)) return { ok: false, message: t("settings.profile.error.format") }
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: t("settings.profile.error.tooLarge") }

  const path = `${user.id}/avatar.${EXTENSIONS[file.type]}`
  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) {
    const detail = uploadError as { message: string; name?: string; status?: number; statusCode?: string }
    console.error(
      `[profile] avatar upload failed path=${path}:`,
      detail.statusCode ?? detail.status ?? "?",
      detail.name ?? "",
      detail.message,
    )
    return { ok: false, message: t("settings.profile.error.uploadFailed") }
  }

  const { url } = getSupabaseEnv()
  const avatarUrl = `${url}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`
  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (dbError) {
    console.error("[profile] avatar_url save failed:", dbError.code)
    return { ok: false, message: t("settings.profile.error.notLinked") }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function removeAvatar(): Promise<ActionResult> {
  const t = await getT(settingsCopy)
  const user = await requireUser()

  const supabase = await createClient()
  const candidates = [...new Set(Object.values(EXTENSIONS))].map((ext) => `${user.id}/avatar.${ext}`)
  await supabase.storage.from("avatars").remove(candidates)

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) return { ok: false, message: t("settings.profile.error.removeFailed") }

  revalidatePath("/", "layout")
  return { ok: true }
}
