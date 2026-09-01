import { NextResponse } from "next/server"
import { hasSupabaseEnv, getSupabaseEnv } from "@/core/env"
import { createClient } from "@/core/supabase/server"

/**
 * Diagnostic route: proves environment loading and server-side Supabase
 * connectivity without touching application tables. Returns no secrets.
 * Safe to delete once real Supabase features exist.
 */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, reason: "Supabase environment variables are not configured" },
      { status: 503 },
    )
  }

  try {
    // Instantiates the canonical server client (validates env + cookie wiring).
    const supabase = await createClient()
    await supabase.auth.getClaims()

    // Live connectivity: the Auth service health endpoint needs no schema.
    const { url, publishableKey } = getSupabaseEnv()
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, reason: `Supabase auth health returned ${res.status}` },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
