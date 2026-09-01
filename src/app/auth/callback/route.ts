import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/core/supabase/server"
import { sanitizeNextPath } from "@/core/auth/redirects"

/**
 * Magic-link callback. Exchanges the emailed credential server-side with
 * the canonical server client and redirects into the app. Supports both
 * link shapes Supabase can send:
 * - token_hash + type (recommended SSR template, verified via verifyOtp)
 * - code (PKCE {{ .ConfirmationURL }} default, exchangeCodeForSession)
 * Invalid or expired links land on the Expired state — never a stack trace,
 * never token details in the response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = sanitizeNextPath(searchParams.get("next"))
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error("[auth] verifyOtp failed:", error.code ?? error.status ?? "unknown")
    return NextResponse.redirect(`${origin}/expired`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error("[auth] code exchange failed:", error.code ?? error.status ?? "unknown")
    return NextResponse.redirect(`${origin}/expired`)
  }

  return NextResponse.redirect(`${origin}/expired`)
}
