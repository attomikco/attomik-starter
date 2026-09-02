import Link from "next/link"
import { getCopy } from "@/core/i18n/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/core/auth/require-user"
import { createClient } from "@/core/supabase/server"
import { acceptInvitation } from "@/modules/settings/team/actions"
import { AuthCardHeader } from "../../card-header"

/**
 * Invitation acceptance. Lives OUTSIDE the (app) group on purpose: the
 * invitee must not trigger the personal-workspace bootstrap before their
 * membership exists. Signed-out visitors are sent through the normal
 * magic-link flow by the proxy and return here. All validity checks live
 * in the hardened RPCs — possession of the emailed token plus a matching
 * verified email is the authorization; acceptance itself is an explicit
 * POST, never a GET side effect.
 */

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const copy = await getCopy()
  const { token } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)

  const supabase = await createClient()
  const { data } = await supabase.rpc("preview_workspace_invitation", { raw_token: token })
  const preview = (data ?? { code: "error" }) as { code: string; workspace_name?: string; role?: string }

  const accept = async () => {
    "use server"
    const result = await acceptInvitation(token)
    if (result.code === "ok" || result.code === "accepted") redirect("/")
    redirect(`/invite/${token}`)
  }

  if (preview.code === "ok") {
    return (
      <>
        <AuthCardHeader stepLabel={copy.auth.invite.step} />
        <div style={{ flex: "none", padding: "26px 0 4px" }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--accent-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
          </span>
          <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>
            {copy.auth.invite.join(preview.workspace_name ?? "")}
          </h1>
          <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 26px", textAlign: "center" }}>
            {copy.auth.invite.invitedAs(copy.roles.labels[preview.role as keyof typeof copy.roles.labels] ?? preview.role ?? "")[0]}<span style={{ fontFamily: "var(--mono)", fontSize: 13.5 }}>{user.email}</span>{copy.auth.invite.invitedAs("")[1]}
          </p>
          <form action={accept}>
            <button type="submit" className="ui-btn"
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "15px 0", fontSize: 15, fontWeight: "var(--w-semi)" as never }}>
              {copy.auth.invite.accept}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <p style={{ fontSize: 12.5, color: "var(--txt-3)", lineHeight: 1.6, margin: "22px 0 0", textAlign: "center" }}>
            {copy.auth.invite.onceNote}
          </p>
        </div>
      </>
    )
  }

  const state = copy.auth.invite.errors[preview.code as keyof typeof copy.auth.invite.errors] ?? copy.auth.invite.errors.error
  return (
    <>
      <AuthCardHeader stepLabel={copy.auth.invite.step} />
      <div style={{ flex: "none", padding: "26px 0 4px" }}>
        <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--warn-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3 2" /></svg>
        </span>
        <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>{state.title}</h1>
        <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 26px", textAlign: "center" }}>{state.body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "12px 22px", textDecoration: "none" }}>
            {copy.auth.invite.openApp}
          </Link>
        </div>
      </div>
    </>
  )
}
