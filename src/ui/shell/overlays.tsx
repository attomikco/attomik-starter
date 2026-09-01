"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { signOut } from "@/core/auth/actions"
import { emailInitials } from "@/core/auth/email-validation"
import type { ShellAccount } from "./app-shell"
import { THEME_MODES, useTheme } from "./theme"
import { useToast } from "./toast-provider"

/**
 * Shell-owned dropdown panels: messages, notifications, account menu.
 * Ported from the reference host. Row content is the reference's authored
 * placeholder data — real notification/message data belongs to later tasks.
 */

const panelStyle: CSSProperties = {
  position: "absolute", top: 48, right: 0, zIndex: 60, width: 380, maxWidth: "calc(100vw - 40px)",
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)",
  boxShadow: "0 22px 50px rgba(0,0,0,.18)", overflow: "hidden", animation: "sh-rise .14s ease-out",
}

function PanelHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 15, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", flex: 1 }}>{title}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", cursor: "pointer" }} onClick={onAction}>{action}</span>
    </div>
  )
}

const MESSAGE_ROWS: [name: string, initials: string, body: string, when: string, unread: boolean][] = [
  ["Alicia Duarte", "AD", "Any update on the refund for order 40218?", "12m", true],
  ["Sam Whitfield", "SW", "Approved the Meta budget shift, over to you.", "1h", true],
  ["Finance", "FI", "August payout reconciled, $18,240 settled.", "3h", false],
  ["Diego Ortiz", "DO", "Sending next wholesale PO on Monday.", "Yesterday", false],
]

export function useUnreadMail() {
  const [read, setRead] = useState<Record<number, boolean>>({})
  return { read, setRead, unread: MESSAGE_ROWS.some((m, i) => m[4] && !read[i]) }
}

export function MessagesPanel({ read, setRead }: { read: Record<number, boolean>; setRead: (r: Record<number, boolean>) => void }) {
  const { say } = useToast()
  return (
    <div style={panelStyle}>
      <PanelHeader title="Messages" action="Mark all read" onAction={() => { setRead({ 0: true, 1: true, 2: true, 3: true }); say("Messages marked read") }} />
      <div className="sh-scroll" style={{ maxHeight: 340 }}>
        {MESSAGE_ROWS.map(([name, initials, body, when, wasUnread], i) => {
          const unread = wasUnread && !read[i]
          return (
            <div key={i} className="sh-row-hover" onClick={() => setRead({ ...read, [i]: true })}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 16px", cursor: "pointer", borderBottom: i < MESSAGE_ROWS.length - 1 ? "1px solid var(--line)" : undefined }}>
              <span style={{ width: 32, height: 32, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", flex: "none", fontSize: 11.5, fontWeight: "var(--w-bold)" as never, color: "var(--txt-2)" }}>{initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, letterSpacing: "-0.01em", color: "var(--txt)", fontWeight: (unread ? "var(--w-semi)" : 500) as never }}>{name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", marginLeft: "auto", flex: "none" }}>{when}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.45, marginTop: 3 }}>{body}</div>
              </div>
              {unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)", display: "block", flex: "none", marginTop: 6 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ALERT_TONES: Record<string, [string, string]> = {
  bad: ["var(--bad)", "var(--bad-tint)"],
  warn: ["var(--warn)", "var(--warn-tint)"],
  ok: ["var(--ok)", "var(--ok-tint)"],
}

const ALERT_ROWS: [title: string, body: string, when: string, unread: boolean, tone: string, icon: string][] = [
  ["Payment failed", "Order 40211 could not capture $1,584.00.", "4m", true, "bad", "M12 8v5M12 17h.01"],
  ["Refund needs approval", "Alicia Duarte requested $412.00 back.", "22m", true, "warn", "M12 7.5v5l3 2"],
  ["Sync completed", "Shopify brought in 148 new orders.", "1h", true, "ok", "m5 13 5 5L20 7"],
  ["Stock low", "Cold Brew 12pk has 9 days of cover left.", "3h", false, "warn", "M12 7.5v5l3 2"],
]

export function useUnreadAlerts() {
  const [read, setRead] = useState<Record<number, boolean>>({})
  return { read, setRead, unread: ALERT_ROWS.some((a, i) => a[3] && !read[i]) }
}

export function NotificationsPanel({ read, setRead }: { read: Record<number, boolean>; setRead: (r: Record<number, boolean>) => void }) {
  const { say } = useToast()
  return (
    <div style={panelStyle}>
      <PanelHeader title="Notifications" action="Mark all read" onAction={() => { setRead({ 0: true, 1: true, 2: true, 3: true }); say("Notifications cleared") }} />
      <div className="sh-scroll" style={{ maxHeight: 340 }}>
        {ALERT_ROWS.map(([title, body, when, wasUnread, tone, icon], i) => {
          const unread = wasUnread && !read[i]
          const [color, tint] = ALERT_TONES[tone]
          return (
            <div key={i} className="sh-row-hover" onClick={() => setRead({ ...read, [i]: true })}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 16px", cursor: "pointer", borderBottom: i < ALERT_ROWS.length - 1 ? "1px solid var(--line)" : undefined }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", flex: "none", color, background: tint }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, letterSpacing: "-0.01em", color: "var(--txt)", fontWeight: (unread ? "var(--w-semi)" : 500) as never }}>{title}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", marginLeft: "auto", flex: "none" }}>{when}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.45, marginTop: 3 }}>{body}</div>
              </div>
              {unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)", display: "block", flex: "none", marginTop: 6 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AccountRow({ icon, label, hint, onPick }: { icon: string; label: string; hint?: string; onPick: () => void }) {
  return (
    <div className="sh-pick" onClick={onPick}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r3)", fontSize: 14, color: "var(--txt-2)", cursor: "pointer" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d={icon} /></svg>
      {label}
      <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)" }}>{hint}</span>
    </div>
  )
}

export function AccountPanel({ account, openPalette, openKeys }: { account: ShellAccount; openPalette: () => void; openKeys: () => void }) {
  const { mode, setMode } = useTheme()
  const { say } = useToast()
  const notWired = () => say("Profiles arrive in a later task")
  const initials = emailInitials(account.email)
  const localPart = account.email.split("@")[0] || account.email

  return (
    <div style={{ ...panelStyle, top: 52, width: 316 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "1px solid var(--line)" }}>
        <span style={{ width: 42, height: 42, borderRadius: 999, background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", color: "var(--accent-text)", display: "grid", placeItems: "center", fontSize: 15, fontWeight: "var(--w-bold)" as never, flex: "none" }}>{initials}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.015em" }}>{localPart}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>{account.email}</div>
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <AccountRow icon="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" label="Profile and account" onPick={notWired} />
        <AccountRow icon="M9 3h6v6H9zM3 9h6v6H3zM15 9h6v6h-6zM9 15h6v6H9z" label="Command palette" hint="⌘K" onPick={openPalette} />
        <AccountRow icon="M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10" label="Keyboard shortcuts" hint="⌘/" onPick={openKeys} />
      </div>
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--line)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 8 }}>Appearance</div>
        <div style={{ display: "flex", gap: 3, background: "var(--shell)", borderRadius: "var(--r3)", padding: 3 }}>
          {THEME_MODES.map(([choice, , short]) => (
            <span key={choice} onClick={() => setMode(choice)}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer", ...(mode === choice ? { background: "var(--card)", color: "var(--txt)" } : { color: "var(--txt-4)" }) }}>
              {short}
            </span>
          ))}
        </div>
      </div>
      <div style={{ padding: 10, borderTop: "1px solid var(--line)" }}>
        <span className="sh-signout" onClick={() => void signOut()}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r3)", fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M15 17l5-5-5-5M20 12H9M12 3H5v18h7" /></svg>
          Sign out
        </span>
      </div>
    </div>
  )
}

/** 38px round icon button used by mail/bell triggers in both bars. */
export function IconButton({ active, onClick, children, unreadDot }: { active: boolean; onClick: () => void; children: ReactNode; unreadDot?: "accent" | "bad" }) {
  return (
    <span onClick={onClick}
      style={{ width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", position: "relative", cursor: "pointer", ...(active ? { background: "var(--accent-tint)", color: "var(--accent-text)" } : { background: "var(--shell)", color: "var(--txt-2)" }) }}>
      {children}
      {unreadDot && (
        <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: unreadDot === "bad" ? "var(--bad-fill)" : "var(--accent)", border: "2px solid var(--shell)" }} />
      )}
    </span>
  )
}
