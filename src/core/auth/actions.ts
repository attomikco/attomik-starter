"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCopy } from "@/core/i18n/server"
import { createClient } from "@/core/supabase/server"
import { validateEmail } from "./email-validation"
import { sanitizeNextPath } from "./redirects"

/**
 * Auth server actions. Both use the canonical server Supabase client.
 * Magic-link responses never reveal whether an address exists — the caller
 * always gets { sent: true } unless the input itself is invalid.
 */

export interface MagicLinkResult {
  sent: boolean
  rateLimited?: boolean
  message?: string
}

async function siteOrigin(): Promise<string> {
  const h = await headers()
  const origin = h.get("origin")
  if (origin) return origin
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function requestMagicLink(rawEmail: string, rawNext?: string): Promise<MagicLinkResult> {
  const check = validateEmail(rawEmail)
  if (!check.ok) return { sent: false, message: (await getCopy()).auth.emailErrors[check.code] }

  const next = sanitizeNextPath(rawNext)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: check.email,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    // Log the class of failure server-side, never the address or tokens.
    console.error("[auth] magic link request failed:", error.code ?? error.status ?? "unknown")

    // A rate limit reveals nothing about whether an account exists, so it
    // may be surfaced honestly. Every other failure stays indistinguishable
    // from success — account enumeration is the leak the reference warns
    // about. No raw Supabase codes reach the user either way.
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return {
        sent: false,
        rateLimited: true,
        message: (await getCopy()).auth.rateLimited,
      }
    }
  }
  return { sent: true }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) console.error("[auth] sign-out failed:", error.code ?? error.status ?? "unknown")
  redirect("/login")
}
