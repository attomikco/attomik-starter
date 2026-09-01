import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/core/env"

/**
 * The canonical browser Supabase client factory. Client Components only.
 * Do not create other browser client factories; modules import this one.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv()
  return createBrowserClient(url, publishableKey)
}
