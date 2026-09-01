import { redirect } from "next/navigation"
import { createClient } from "@/core/supabase/server"

/**
 * Verified server-side identity, per current Supabase guidance: getClaims()
 * validates the JWT signature locally (never trust browser state or
 * getSession() for authorization). Use getUser() only when a fresh user
 * record is needed.
 */

export interface AuthUser {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  const { sub, email } = data.claims as { sub?: string; email?: string }
  if (!sub) return null
  return { id: sub, email: email ?? "" }
}

/** Route guard for server components: redirects to login when signed out. */
export async function requireUser(nextPath?: string): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login")
  }
  return user
}
