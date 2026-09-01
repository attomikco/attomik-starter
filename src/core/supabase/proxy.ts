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
  const { data } = await supabase.auth.getClaims()

  // Route protection: signed-out page loads go to login with a return path.
  // Only GET/HEAD — redirecting a Server Action POST hands the client HTML
  // where it expects a flight response ("An unexpected response was received
  // from the server"). Non-GET requests pass through; the (app) layout's
  // requireUser() and the actions themselves still enforce auth.
  const { pathname, search } = request.nextUrl
  const isNavigation = request.method === "GET" || request.method === "HEAD"
  if (isNavigation && !data?.claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = `next=${encodeURIComponent(pathname + search)}`
    const redirect = NextResponse.redirect(url)
    // Carry any refreshed auth cookies onto the redirect, or sessions desync.
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => redirect.cookies.set(name, value))
    return redirect
  }

  return supabaseResponse
}

/** Routes reachable without a session: the auth surface and diagnostics. */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/verify" ||
    pathname === "/expired" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/health/") ||
    pathname === "/dev/theme" ||
    pathname === "/dev/auth"
  )
}
