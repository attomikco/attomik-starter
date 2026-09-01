import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/core/env"

/**
 * The canonical server Supabase client factory, for Server Components,
 * Server Actions, and Route Handlers. Always created per request — never
 * cache or share the returned client across requests.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabaseEnv()

  return createServerClient(url, publishableKey, {
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
