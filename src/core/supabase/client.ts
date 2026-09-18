import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/core/env"
import { guardRowCap } from "./row-cap-guard"

/**
 * The canonical browser Supabase client factory. Client Components only.
 * Do not create other browser client factories; modules import this one.
 * Guarded like the server client: a read that returns exactly 1,000 rows
 * without a limit (PostgREST's silent cap) throws in development and warns
 * in production — see row-cap-guard.ts.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv()
  return guardRowCap(createBrowserClient(url, publishableKey))
}
