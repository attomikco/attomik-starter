"use client"

import { emailInitials } from "@/core/auth/email-validation"
import type { ShellAccount } from "./app-shell"
import { AccountPanel, IconButton, MessagesPanel, NotificationsPanel, useUnreadAlerts, useUnreadMail } from "./overlays"

export type ShellPanel = "mail" | "bell" | "account" | null

/**
 * Desktop command bar, ported from the reference host: palette trigger
 * styled as a search field with the ⌘K chip, messages + notifications
 * buttons with unread dots, divider, account trigger.
 */
export function CommandBar({
  account,
  panel,
  setPanel,
  openPalette,
  openKeys,
}: {
  account: ShellAccount
  panel: ShellPanel
  setPanel: (p: ShellPanel) => void
  openPalette: () => void
  openKeys: () => void
}) {
  const mail = useUnreadMail()
  const alerts = useUnreadAlerts()
  const initials = emailInitials(account.email)
  const localPart = account.email.split("@")[0] || account.email
  const toggle = (p: Exclude<ShellPanel, null>) => setPanel(panel === p ? null : p)

  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--r)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 18, flex: "none", position: "relative", zIndex: 30 }}>
      <div onClick={openPalette}
        style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, background: "var(--shell)", borderRadius: 13, padding: "11px 14px", cursor: "pointer" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" style={{ flex: "none" }}><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
        <span style={{ fontSize: 14.5, color: "var(--txt-3)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Search orders, customers, SKUs</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-4)", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 7px" }}>⌘K</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "none" }}>
        <div style={{ position: "relative" }}>
          <IconButton active={panel === "mail"} onClick={() => toggle("mail")} unreadDot={mail.unread ? "accent" : undefined}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
          </IconButton>
          {panel === "mail" && <MessagesPanel read={mail.read} setRead={mail.setRead} />}
        </div>

        <div style={{ position: "relative" }}>
          <IconButton active={panel === "bell"} onClick={() => toggle("bell")} unreadDot={alerts.unread ? "bad" : undefined}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          </IconButton>
          {panel === "bell" && <NotificationsPanel read={alerts.read} setRead={alerts.setRead} />}
        </div>
      </div>

      <div style={{ width: 1, height: 30, background: "var(--line)" }} />

      <div style={{ position: "relative" }}>
        <div onClick={() => toggle("account")}
          style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 10px 4px 4px", borderRadius: 999, cursor: "pointer", background: panel === "account" ? "var(--shell)" : "transparent" }}>
          <span style={{ width: 38, height: 38, borderRadius: 999, background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", color: "var(--accent-text)", display: "grid", placeItems: "center", fontSize: 13.5, fontWeight: "var(--w-bold)" as never, flex: "none" }}>{initials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{localPart}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{account.email}</div>
          </div>
          <span style={{ color: "var(--txt-4)", fontSize: 11, fontFamily: "var(--mono)", transform: panel === "account" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .12s" }}>▾</span>
        </div>
        {panel === "account" && <AccountPanel account={account} openPalette={openPalette} openKeys={openKeys} />}
      </div>
    </div>
  )
}
