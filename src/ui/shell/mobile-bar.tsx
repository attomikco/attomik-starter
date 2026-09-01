"use client"

import { copy } from "@/core/i18n"
import type { ShellPanel } from "./command-bar"

/**
 * Mobile top bar (<900px), ported from the reference host: hamburger opens
 * the rail drawer, current screen label, palette trigger.
 */
export function MobileBar({
  screenLabel,
  openRail,
  openPalette,
}: {
  screenLabel: string
  panel?: ShellPanel
  setPanel?: (p: ShellPanel) => void
  openRail: () => void
  openPalette: () => void
}) {
  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--r2)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
      <button className="ui-btn" aria-label={copy.nav.openNavigation} onClick={openRail}
        style={{ width: 38, height: 38, borderRadius: "var(--r3)", background: "var(--shell)", display: "grid", placeItems: "center", flex: "none" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--txt-2)" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <span style={{ fontSize: 15, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.015em", flex: 1, minWidth: 0 }}>{screenLabel}</span>
      <button className="ui-btn" aria-label={copy.nav.openPalette} onClick={openPalette}
        style={{ width: 38, height: 38, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", flex: "none" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--txt-2)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
      </button>
    </div>
  )
}
