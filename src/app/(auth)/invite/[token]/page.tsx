import Link from "next/link"
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

const COPY: Record<string, { title: string; body: string }> = {
  invalid: { title: "This invitation link is not valid", body: "The link may be incomplete, or it was replaced by a newer email. Use the most recent invitation email, or ask to be invited again." },
  expired: { title: "This invitation has expired", body: "Invitations work for seven days. Nothing is wrong with your account — ask the workspace to send a fresh one." },
  revoked: { title: "This invitation was revoked", body: "The workspace withdrew this invitation. If that seems wrong, ask them to invite you again." },
  accepted: { title: "Already accepted", body: "This invitation has already been used. If that was you, just open the app." },
  wrong_email: { title: "This invitation belongs to another email", body: "You are signed in with a different address than the one invited. Sign out and open the link again with the invited address." },
  error: { title: "Something went wrong", body: "The invitation could not be processed. Try the link again in a moment." },
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
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
        <AuthCardHeader stepLabel="Workspace invitation" />
        <div style={{ flex: "none", padding: "26px 0 4px" }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--accent-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
          </span>
          <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>
            Join {preview.workspace_name}
          </h1>
          <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 26px", textAlign: "center" }}>
            You were invited as <span style={{ color: "var(--txt)", fontWeight: "var(--w-semi)" as never }}>{preview.role}</span>, signed in as{" "}
            <span style={{ fontFamily: "var(--mono)", fontSize: 13.5 }}>{user.email}</span>.
          </p>
          <form action={accept}>
            <button type="submit" className="ui-btn"
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "15px 0", fontSize: 15, fontWeight: "var(--w-semi)" as never }}>
              Accept invitation
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <p style={{ fontSize: 12.5, color: "var(--txt-3)", lineHeight: 1.6, margin: "22px 0 0", textAlign: "center" }}>
            The link works once. Accepting adds this account to the workspace.
          </p>
        </div>
      </>
    )
  }

  const copy = COPY[preview.code] ?? COPY.error
  return (
    <>
      <AuthCardHeader stepLabel="Workspace invitation" />
      <div style={{ flex: "none", padding: "26px 0 4px" }}>
        <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--warn-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3 2" /></svg>
        </span>
        <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>{copy.title}</h1>
        <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 26px", textAlign: "center" }}>{copy.body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "12px 22px", textDecoration: "none" }}>
            Open the app
          </Link>
        </div>
      </div>
    </>
  )
}
