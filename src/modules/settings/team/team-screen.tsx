"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { PendingInvitation, TeamMember } from "@/core/team"
import { assignableRoles, canManageTarget, canInvite, ROLE_MEANINGS, type Role } from "@/core/permissions"
import { DataTable, PersonCell, ToneChip } from "@/ui/data/data-table"
import { validateEmail } from "@/core/auth/email-validation"
import { TextInput } from "@/ui/forms/fields"
import { ConfirmDialog, type ConfirmOptions } from "@/ui/records/confirm-dialog"
import { useToast } from "@/ui/shell/toast-provider"
import { changeMemberRole, inviteMember, removeMember, resendInvitation, revokeInvitation } from "./actions"

/**
 * Team & permissions screen, ported from part-settings.dc.html (team tab):
 * seat stats, member table (Task 007 DataTable — the first real consumer),
 * role capability card, pending invitations, and the reference invite
 * dialog. Controls the actor cannot use are absent, but every action is
 * re-authorized server-side and by RLS.
 */

const ROLE_TONE: Record<Role, "ok" | "warn" | "neutral" | "bad"> = {
  owner: "ok", admin: "warn", member: "neutral", viewer: "neutral",
}

export function TeamScreen({
  actorRole,
  actorId,
  members,
  invitations,
}: {
  actorRole: Role
  actorId: string
  members: TeamMember[]
  invitations: PendingInvitation[]
}) {
  const router = useRouter()
  const { say } = useToast()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const canManage = canInvite(actorRole)

  const run = async (key: string, fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => {
    setBusy(key)
    const result = await fn()
    setBusy(null)
    say(result.ok ? okMsg : result.message ?? "That did not work")
    if (result.ok) router.refresh()
  }

  const stats: [string, string, string, boolean][] = [
    ["Members", String(members.length), "in this workspace", true],
    ["Admins", String(members.filter((m) => m.role === "owner" || m.role === "admin").length), "incl. the owner", false],
    ["Pending invites", String(invitations.length), "expire after 7 days", false],
    ["Your role", actorRole, ROLE_MEANINGS[actorRole].toLowerCase(), false],
  ]

  const columns = [
    {
      key: "member", label: "Member", pinned: true, flex: true, sortable: false,
      render: (m: TeamMember) => <PersonCell name={m.displayName ?? m.email.split("@")[0]} sub={m.email} />,
    },
    {
      key: "role", label: "Role", width: 168,
      render: (m: TeamMember) =>
        canManageTarget(actorRole, m.role) ? (
          <select
            aria-label={`Role for ${m.email}`}
            value={m.role}
            disabled={busy === m.userId}
            onChange={(e) => run(m.userId, () => changeMemberRole(m.userId, m.role, e.target.value), "Role updated")}
            style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "var(--txt)", appearance: "none", cursor: "pointer" }}
          >
            <option value={m.role}>{m.role}</option>
            {assignableRoles(actorRole).filter((r) => r !== m.role).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        ) : (
          <ToneChip tone={ROLE_TONE[m.role]} label={m.role} />
        ),
    },
    {
      key: "joined", label: "Joined", width: 116, align: "right" as const, mono: true,
      text: (m: TeamMember) => m.joinedAt.slice(0, 10),
    },
    {
      key: "actions", label: "", width: 44,
      render: (m: TeamMember) =>
        canManageTarget(actorRole, m.role) && m.userId !== actorId ? (
          <button className="ui-btn" aria-label={`Remove ${m.email}`}
            onClick={() => setConfirm({
              tone: "bad",
              title: `Remove ${m.email}?`,
              body: "They lose access to this workspace immediately. Their account and anything they created stay intact, and they can be invited again later.",
              confirmLabel: "Remove from workspace",
              cancelLabel: "Keep them",
              onConfirm: () => run(m.userId, () => removeMember(m.userId, m.role), "Member removed"),
            })}
            style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--txt-4)" }}>
            ✕
          </button>
        ) : null,
    },
  ]

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", flex: "none" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>Workspace · people</div>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 0" }}>Team & permissions</h1>
        </div>
        {canManage && (
          <button className="ui-btn" onClick={() => setInviteOpen(true)}
            style={{ height: 42, padding: "0 20px", background: "var(--accent)", borderRadius: 999, display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Invite member
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, flex: "none" }}>
        {stats.map(([label, value, sub, lead]) => (
          <div key={label} style={{ borderRadius: "var(--r2)", padding: 20, minWidth: 0, ...(lead ? { background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box" as const } : { background: "var(--shell)" }) }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 12 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.035em", lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 8 }}>{sub}</div>
          </div>
        ))}
      </div>

      <DataTable<TeamMember>
        columns={columns}
        rows={members}
        rowKey={(m) => m.userId}
        state="ready"
        empty={{ title: "No members yet", body: "Invite the first person to this workspace." }}
        footerText={`${members.length} member${members.length === 1 ? "" : "s"}`}
      />

      {canManage && invitations.length > 0 && (
        <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, flex: "none" }}>
          <div style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 14 }}>Pending invitations</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {invitations.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", flexWrap: "wrap", borderBottom: i < invitations.length - 1 ? "1px solid var(--line)" : undefined }}>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{inv.email}</span>
                  <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>
                    as {inv.role} · expires {inv.expiresAt.slice(0, 10)}
                  </span>
                </span>
                <ToneChip tone="warn" label="Invited" />
                <button className="ui-btn" disabled={busy === inv.id}
                  onClick={() => run(inv.id, () => resendInvitation(inv.id), "Invitation resent — the old link stopped working")}
                  style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "8px 14px" }}>
                  Resend
                </button>
                <button className="ui-btn" disabled={busy === inv.id}
                  onClick={() => setConfirm({
                    tone: "bad",
                    title: `Revoke the invitation for ${inv.email}?`,
                    body: "The emailed link stops working immediately. You can invite them again at any time.",
                    confirmLabel: "Revoke it",
                    onConfirm: () => run(inv.id, () => revokeInvitation(inv.id), "Invitation revoked"),
                  })}
                  style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "7px 13px" }}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, flex: "none" }}>
        <div style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 4 }}>What each role can do</div>
        <div style={{ fontSize: 13.5, color: "var(--txt-2)", marginBottom: 14 }}>
          Owner is locked, because a workspace with no full administrator is how people get locked out of their own data.
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(Object.keys(ROLE_MEANINGS) as Role[]).map((r, i, arr) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : undefined }}>
              <span style={{ width: 90, flex: "none" }}><ToneChip tone={ROLE_TONE[r]} label={r} /></span>
              <span style={{ fontSize: 13.5, color: "var(--txt-2)" }}>{ROLE_MEANINGS[r]}</span>
            </div>
          ))}
        </div>
      </div>

      {inviteOpen && (
        <InviteDialog
          roles={assignableRoles(actorRole)}
          existingEmails={members.map((m) => m.email)}
          invitedEmails={invitations.map((i) => i.email)}
          onClose={() => setInviteOpen(false)}
          onDone={(msg) => { setInviteOpen(false); say(msg); router.refresh() }}
        />
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

function InviteDialog({
  roles,
  existingEmails,
  invitedEmails,
  onClose,
  onDone,
}: {
  roles: Role[]
  existingEmails: string[]
  invitedEmails: string[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>(roles.includes("member") ? "member" : roles[0])
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (sending) return
    const check = validateEmail(email)
    if (!check.ok) return setError(check.message)
    const normalized = check.email.toLowerCase()
    if (existingEmails.includes(normalized)) return setError(`${normalized} is already a member of this workspace.`)
    if (invitedEmails.includes(normalized)) return setError(`${normalized} already has a pending invitation — resend it instead.`)
    setSending(true)
    setError("")
    const result = await inviteMember(normalized, role)
    setSending(false)
    if (!result.ok) return setError(result.message ?? "Could not send the invitation.")
    onDone(`Invitation sent to ${normalized}`)
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,10,14,.38)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Invite to the workspace" onClick={(e) => e.stopPropagation()}
        style={{ width: 480, maxWidth: "calc(100% - 32px)", background: "var(--card)", borderRadius: "var(--r)", padding: 30, boxShadow: "0 30px 70px rgba(0,0,0,.3)", animation: "sh-rise .16s ease-out" }}>
        <div style={{ fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", marginBottom: 8 }}>Invite to the workspace</div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 22px" }}>
          They get a branded email with a single-use link that signs them in — no password.
        </p>
        <div style={{ marginBottom: 16 }}>
          <TextInput label="Work email" required value={email} placeholder="name@company.com"
            onChange={(v) => { setEmail(v); setError("") }} error={error || undefined} />
        </div>
        <div role="radiogroup" aria-label="Role" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {roles.map((r) => {
            const on = r === role
            return (
              <button type="button" key={r} className="ui-btn" role="radio" aria-checked={on} onClick={() => setRole(r)}
                style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--r3)", padding: "12px 14px", boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`, textAlign: "left" }}>
                <span aria-hidden style={{ width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", boxSizing: "border-box", flex: "none", border: `1.5px solid ${on ? "var(--accent-text)" : "var(--line-2)"}` }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, display: "block", background: on ? "var(--accent-text)" : "transparent" }} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{r}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--txt-2)", marginTop: 2 }}>{ROLE_MEANINGS[r]}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ui-btn sh-pick" onClick={onClose}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "12px 0" }}>
            Cancel
          </button>
          <button className="ui-btn" onClick={submit} disabled={sending}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "13px 0", opacity: sending ? 0.6 : 1 }}>
            {sending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  )
}
