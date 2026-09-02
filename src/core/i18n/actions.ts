"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/core/auth/require-user"
import { logDbFailure } from "@/core/supabase/diagnostics"
import { createClient } from "@/core/supabase/server"
import { isLocale } from "./index"
import { getCopy } from "./server"

/**
 * The user's personal interface language. Lives on their own profile row
 * (RLS: own row only), so every role may set it and nobody can set another
 * user's. `null` clears the override: the workspace default applies again.
 * Revalidates the whole layout so the next render — <html lang>,
 * navigation, every dictionary read — is already in the new language.
 */
export async function saveUserLocale(locale: string | null): Promise<{ ok: boolean; message?: string }> {
  const copy = await getCopy()
  const user = await requireUser()
  if (locale !== null && !isLocale(locale)) return { ok: false, message: copy.account.languageInvalid }

  // Read the row back: an RLS-filtered update raises no error and touches
  // no rows, so "ok" must mean the row now carries the value.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({ locale, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("locale")
  if (error || !data?.length) {
    logDbFailure("i18n.userLocale", error, `user ${user.id.slice(0, 8)}… has no updatable profile row`)
    return { ok: false, message: copy.account.languageFailed }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}
