import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseEnv, hasSupabaseEnv } from "@/core/env"

let warnedMissingEnv = false

/**
 * Refreshes the Supabase auth session on every matched request and forwards
 * the refreshed cookies both upstream (to Server Components) and back to the
 * browser. Called from src/proxy.ts. No route protection lives here —
 * authenticated gating belongs to a later task.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Without Supabase configured the starter still runs (Task 001 features
  // don't need it), so pass through instead of failing every request.
  if (!hasSupabaseEnv()) {
    if (!warnedMissingEnv && process.env.NODE_ENV !== "production") {
      warnedMissingEnv = true
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set — session refresh disabled.",
      )
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  const { url, publishableKey } = getSupabaseEnv()

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Do not run code between createServerClient and getClaims(): a subtle bug
  // can make sessions randomly log out. getClaims() validates the JWT and
  // refreshes an expired token; never trust getSession() in server code.
  await supabase.auth.getClaims()

  // When returning a custom response from here later, copy the cookies from
  // supabaseResponse onto it, or sessions will desync.
  return supabaseResponse
}
