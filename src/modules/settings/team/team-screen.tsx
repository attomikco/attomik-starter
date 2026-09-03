"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { PendingInvitation, TeamMember } from "@/core/team"
import { assignableRoles, canManageTarget, canInvite, ROLES, type Role } from "@/core/permissions"
import { useCopy, useFormat, useT } from "@/core/i18n/client"
import { DataTable, PersonCell, ToneChip } from "@/ui/data/data-table"
import { validateEmail } from "@/core/auth/email-validation"
import { TextInput } from "@/ui/forms/fields"
import { Listbox } from "@/ui/forms/select"
import { ConfirmDialog, type ConfirmOptions } from "@/ui/records/confirm-dialog"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"
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
  defaultRole,
}: {
  actorRole: Role
  actorId: string
  members: TeamMember[]
  invitations: PendingInvitation[]
  /** The workspace's default for new invitations (Settings → General). */
  defaultRole?: string
}) {
  const router = useRouter()
  const { say } = useToast()
  const copy = useCopy()
  const t = useT(settingsCopy)
  const fmt = useFormat()
  const ROLE_LABELS = copy.roles.labels
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const canManage = canInvite(actorRole)

  const run = async (key: string, fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => {
    setBusy(key)
    const result = await fn()
    setBusy(null)
    say(result.ok ? okMsg : result.message ?? t("settings.team.toast.failed"))
    if (result.ok) router.refresh()
  }

  const adminCount = members.filter((m) => m.role === "owner" || m.role === "admin").length
  const summary = [
    t.n("settings.team.summary.members", members.length),
    t.n("settings.team.summary.admins", adminCount),
    t.n("settings.team.summary.invitations", invitations.length),
    t("settings.team.summary.yourRole", { role: ROLE_LABELS[actorRole] }),
  ].join(" · ")

  const columns = [
    {
      key: "member", label: t("settings.team.column.member"), pinned: true, flex: true, sortable: false,
      render: (m: TeamMember) => <PersonCell name={m.displayName ?? m.email.split("@")[0]} sub={m.email} />,
    },
    {
      key: "role", label: t("settings.team.column.role"), width: 168,
      render: (m: TeamMember) =>
        canManageTarget(actorRole, m.role) ? (
          <Listbox
            ariaLabel={t("settings.team.roleFor", { email: m.email })}
            value={m.role}
            disabled={busy === m.userId}
            options={[m.role, ...assignableRoles(actorRole).filter((r) => r !== m.role)].map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            onChange={(r) => run(m.userId, () => changeMemberRole(m.userId, m.role, r), t("settings.team.toast.roleUpdated"))}
            minWidth={110}
            triggerStyle={{ padding: "6px 10px", fontSize: 13 }}
          />
        ) : (
          <ToneChip tone={ROLE_TONE[m.role]} label={m.role} />
        ),
    },
    {
      key: "joined", label: t("settings.team.column.joined"), width: 116, align: "right" as const, mono: true,
      text: (m: TeamMember) => fmt.date(m.joinedAt),
    },
    {
      key: "actions", label: "", width: 44,
      render: (m: TeamMember) =>
        canManageTarget(actorRole, m.role) && m.userId !== actorId ? (
          <button className="ui-btn" aria-label={t("settings.team.remove.label", { email: m.email })}
            onClick={() => setConfirm({
              tone: "bad",
              title: t("settings.team.remove.title", { email: m.email }),
              body: t("settings.team.remove.body"),
              confirmLabel: t("settings.team.remove.confirm"),
              cancelLabel: t("settings.team.remove.cancel"),
              onConfirm: () => run(m.userId, () => removeMember(m.userId, m.role), t("settings.team.toast.memberRemoved")),
            })}
            style={{ width: 30, height: 30, borderRadius: "var(--r3)", display: "grid", placeItems: "center", color: "var(--txt-4)" }}>
            ✕
          </button>
        ) : null,
    },
  ]

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", flex: "none" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>{t("settings.team.eyebrow")}</div>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.team.title")}</h1>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{summary}</div>
        </div>
        {canManage && (
          <button className="ui-btn" onClick={() => setInviteOpen(true)}
            style={{ height: 42, padding: "0 20px", background: "var(--accent)", borderRadius: 999, display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t("settings.team.invite")}
          </button>
        )}
      </div>

      <DataTable<TeamMember>
        columns={columns}
        rows={members}
        rowKey={(m) => m.userId}
        layout="auto"
        state="ready"
        empty={{ title: t("settings.team.empty.title"), body: t("settings.team.empty.body") }}
        footerText={t.n("settings.team.summary.members", members.length)}
      />

      {canManage && invitations.length > 0 && (
        <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, flex: "none" }}>
          <div style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 14 }}>{t("settings.team.pending")}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {invitations.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", flexWrap: "wrap", borderBottom: i < invitations.length - 1 ? "1px solid var(--line)" : undefined }}>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{inv.email}</span>
                  <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>
                    {t("settings.team.invitedAs", { role: ROLE_LABELS[inv.role], date: fmt.date(inv.expiresAt) })}
                  </span>
                </span>
                <ToneChip tone="warn" label={t("settings.team.invitedChip")} />
                <button className="ui-btn" disabled={busy === inv.id}
                  onClick={() => run(inv.id, () => resendInvitation(inv.id), t("settings.team.toast.resent"))}
                  style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "8px 14px" }}>
                  {t("settings.team.resend")}
                </button>
                <button className="ui-btn" disabled={busy === inv.id}
                  onClick={() => setConfirm({
                    tone: "bad",
                    title: t("settings.team.revoke.title", { email: inv.email }),
                    body: t("settings.team.revoke.body"),
                    confirmLabel: t("settings.team.revoke.confirm"),
                    onConfirm: () => run(inv.id, () => revokeInvitation(inv.id), t("settings.team.toast.revoked")),
                  })}
                  style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "7px 13px" }}>
                  {t("settings.team.revoke")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: "16px 20px", flex: "none" }}>
        <div style={{ fontSize: 14.5, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.015em", marginBottom: 2 }}>{t("settings.team.roles.title")}</div>
        <div style={{ fontSize: 12.5, color: "var(--txt-2)", marginBottom: 10 }}>{t("settings.team.roles.body")}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ROLES.map((r, i, arr) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : undefined }}>
              <span style={{ width: 96, flex: "none" }}><ToneChip tone={ROLE_TONE[r]} label={ROLE_LABELS[r]} /></span>
              <span style={{ fontSize: 13, color: "var(--txt-2)" }}>{copy.roles.meanings[r]}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          {t("settings.team.roles.ownerNote")}
        </div>
      </div>

      {inviteOpen && (
        <InviteDialog
          roles={assignableRoles(actorRole)}
          defaultRole={defaultRole}
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
  defaultRole,
  existingEmails,
  invitedEmails,
  onClose,
  onDone,
}: {
  roles: Role[]
  defaultRole?: string
  existingEmails: string[]
  invitedEmails: string[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const copy = useCopy()
  const t = useT(settingsCopy)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>(roles.includes(defaultRole as Role) ? (defaultRole as Role) : roles.includes("member") ? "member" : roles[0])
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (sending) return
    const check = validateEmail(email)
    if (!check.ok) return setError(copy.auth.emailErrors[check.code])
    const normalized = check.email.toLowerCase()
    if (existingEmails.includes(normalized)) return setError(t("settings.team.error.alreadyMember", { email: normalized }))
    if (invitedEmails.includes(normalized)) return setError(t("settings.team.error.alreadyInvited", { email: normalized }))
    setSending(true)
    setError("")
    const result = await inviteMember(normalized, role)
    setSending(false)
    if (!result.ok) return setError(result.message ?? t("settings.team.dialog.error"))
    onDone(t("settings.team.dialog.sent", { email: normalized }))
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,10,14,.38)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("settings.team.dialog.title")} onClick={(e) => e.stopPropagation()}
        style={{ width: 480, maxWidth: "calc(100% - 32px)", background: "var(--card)", borderRadius: "var(--r)", padding: 30, boxShadow: "0 30px 70px rgba(0,0,0,.3)", animation: "sh-rise .16s ease-out" }}>
        <div style={{ fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", marginBottom: 8 }}>{t("settings.team.dialog.title")}</div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 22px" }}>
          {t("settings.team.dialog.body")}
        </p>
        <div style={{ marginBottom: 16 }}>
          <TextInput label={t("settings.team.dialog.email")} required value={email} placeholder={t("settings.team.dialog.emailPlaceholder")}
            onChange={(v) => { setEmail(v); setError("") }} error={error || undefined} />
        </div>
        <div role="radiogroup" aria-label={t("settings.team.dialog.role")} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {roles.map((r) => {
            const on = r === role
            return (
              <button type="button" key={r} className="ui-btn" role="radio" aria-checked={on} onClick={() => setRole(r)}
                style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: "var(--r3)", padding: "12px 14px", boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`, textAlign: "left" }}>
                <span aria-hidden style={{ width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", boxSizing: "border-box", flex: "none", border: `1.5px solid ${on ? "var(--accent-text)" : "var(--line-2)"}` }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, display: "block", background: on ? "var(--accent-text)" : "transparent" }} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{copy.roles.labels[r]}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--txt-2)", marginTop: 2 }}>{copy.roles.meanings[r]}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ui-btn sh-pick" onClick={onClose}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "12px 0" }}>
            {t("settings.team.dialog.cancel")}
          </button>
          <button className="ui-btn" onClick={submit} disabled={sending}
            style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-ink)", background: "var(--accent)", borderRadius: 999, padding: "13px 0", opacity: sending ? 0.6 : 1 }}>
            {sending ? t("settings.team.dialog.sending") : t("settings.team.dialog.send")}
          </button>
        </div>
      </div>
    </div>
  )
}
