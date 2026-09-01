import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/core/env"

/**
 * The canonical server Supabase client factory, for Server Components,
 * Server Actions, and Route Handlers. Always created per request — never
 * cache or share the returned client across requests.
 *
 * Data reads must opt OUT of Next/React render-pass fetch memoization: two
 * identical PostgREST GETs in one render otherwise share the FIRST
 * response, so a read-after-write (the workspace bootstrap's membership
 * retry) sees stale pre-write data (verified live in the production
 * build). `cache: "no-store"` states the intent; the per-call
 * AbortController signal is the documented memoization opt-out. Request
 * deduplication belongs at our layer (React cache on requireWorkspace),
 * not silently inside fetch.
 */
const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, { cache: "no-store", ...init, signal: init?.signal ?? new AbortController().signal })

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabaseEnv()

  return createServerClient(url, publishableKey, {
    global: { fetch: uncachedFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Components cannot write cookies. Safe to ignore: the
          // proxy (src/core/supabase/proxy.ts) refreshes sessions instead.
        }
      },
    },
  })
}
