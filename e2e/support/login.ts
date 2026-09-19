import { createClient } from "@supabase/supabase-js"
import type { Page } from "@playwright/test"
import { resolveE2eTarget } from "./target"

/**
 * Real magic-link sign-in for e2e tests, no mocked session. Creates a
 * throwaway auth user, mints a genuine magic-link token via the admin API,
 * and drives the browser through the app's own /auth/callback route (the
 * same route a real emailed link hits) — the app's own bootstrap then
 * creates their workspace on first load, same as any new user.
 *
 * The admin client points ONLY at the local stack: the target comes from
 * resolveE2eTarget() (E2E_SUPABASE_*), which refuses anything that is not
 * loopback or that carries a hosted project's key. See docs/SUPABASE.md.
 */
export async function loginAsNewUser(page: Page): Promise<{ userId: string; email: string; cleanup: () => Promise<void> }> {
  const { url, serviceRoleKey } = resolveE2eTarget()
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@attomik.test`
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (createError || !created.user) throw new Error(`could not create e2e user: ${createError?.message}`)

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (linkError || !link.properties?.hashed_token) throw new Error(`could not mint a magic link: ${linkError?.message}`)

  await page.goto(`/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink`)

  const cleanup = async () => {
    // Members first: deleting a workspace that still has members aborts in
    // the member-audit trigger (23503), and the user is pinned by the
    // workspace's created_by until it is gone.
    const { data: owned } = await admin.from("workspaces").select("id").eq("created_by", created.user!.id)
    const ids = (owned ?? []).map((w) => w.id as string)
    if (ids.length) {
      await admin.from("workspace_members").delete().in("workspace_id", ids)
      await admin.from("workspaces").delete().in("id", ids)
    }
    await admin.auth.admin.deleteUser(created.user!.id)
  }

  return { userId: created.user.id, email, cleanup }
}
