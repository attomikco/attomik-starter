"use client"

import { IconButton, NotificationsPanel, useUnreadAlerts } from "./overlays"
import type { ShellPanel } from "./command-bar"

/**
 * Mobile top bar (<900px), ported from the reference host: hamburger opens
 * the rail drawer, current screen label, palette trigger, notifications.
 */
export function MobileBar({
  screenLabel,
  panel,
  setPanel,
  openRail,
  openPalette,
}: {
  screenLabel: string
  panel: ShellPanel
  setPanel: (p: ShellPanel) => void
  openRail: () => void
  openPalette: () => void
}) {
  const alerts = useUnreadAlerts()

  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--r2)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
      <span onClick={openRail}
        style={{ width: 38, height: 38, borderRadius: "var(--r3)", background: "var(--shell)", display: "grid", placeItems: "center", flex: "none", cursor: "pointer" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt-2)" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </span>
      <span style={{ fontSize: 15, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.015em", flex: 1, minWidth: 0 }}>{screenLabel}</span>
      <span onClick={openPalette}
        style={{ width: 38, height: 38, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", flex: "none", cursor: "pointer" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--txt-2)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
      </span>
      <div style={{ position: "relative", flex: "none" }}>
        <IconButton active={panel === "bell"} onClick={() => setPanel(panel === "bell" ? null : "bell")} unreadDot={alerts.unread ? "bad" : undefined}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        </IconButton>
        {panel === "bell" && <NotificationsPanel read={alerts.read} setRead={alerts.setRead} />}
      </div>
    </div>
  )
}
