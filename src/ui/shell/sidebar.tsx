"use client"

import { usePathname } from "next/navigation"
import type { CSSProperties } from "react"
import type { NavigationGroup } from "@/core/navigation"
import type { ShellWorkspace } from "./app-shell"
import { GROUP_LABELS } from "@/core/navigation/build"
import { NavItem } from "./nav-item"
import { THEME_MODES, useTheme } from "./theme"

/**
 * The rail, ported from the reference host: 244px expanded / 76px collapsed
 * on desktop, absolute 252px drawer on mobile. Logo placeholder row,
 * grouped nav (labels expanded, hairline collapsed), theme switch, credit.
 */
export function Sidebar({
  workspace,
  navigation,
  mobile,
  tight,
  chromeFull,
  onToggleCollapse,
  onNavigate,
}: {
  workspace: ShellWorkspace
  navigation: NavigationGroup[]
  mobile: boolean
  tight: boolean
  chromeFull: boolean
  onToggleCollapse: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { mode, setMode } = useTheme()

  const railStyle: CSSProperties = mobile
    ? { position: "absolute", zIndex: 50, top: 10, left: 10, bottom: 10, width: 252, background: "var(--card)", borderRadius: "var(--r)", boxShadow: "0 24px 60px rgba(0,0,0,.26)", display: "flex", flexDirection: "column", padding: "14px 10px 8px 14px", boxSizing: "border-box" }
    : {
        width: tight ? 76 : 244, flex: "none", alignSelf: "stretch", display: "flex", flexDirection: "column",
        padding: tight ? "10px 10px 4px" : chromeFull ? "14px 16px 8px 14px" : "10px 16px 4px 10px",
        marginRight: chromeFull ? undefined : -4,
        boxSizing: "border-box", borderRight: "1px solid var(--line)", transition: "width .16s ease",
      }

  return (
    <div style={railStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "4px 4px 18px", flex: "none" }}>
        {!tight && <WorkspaceMark workspace={workspace} />}
        {!mobile && (
          <span
            onClick={onToggleCollapse}
            title={tight ? "Expand the sidebar" : "Collapse the sidebar"}
            style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", cursor: "pointer", flex: "none", color: "var(--txt-3)", background: tight ? "var(--card)" : "transparent" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
          </span>
        )}
      </div>

      <div className="sh-scroll" style={{ flex: "1 1 auto", minHeight: 40, marginRight: -4, paddingRight: 4 }}>
        {navigation.map(({ group, items }) => (
          <div key={group} style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 16 }}>
            {!tight ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--txt-4)", padding: "0 12px 8px" }}>
                {GROUP_LABELS[group]}
              </div>
            ) : (
              <div style={{ height: 1, background: "var(--line)", margin: "0 8px 8px", display: "block" }} />
            )}
            {items.map((item) => (
              <NavItem
                key={item.moduleId}
                item={item}
                pathname={pathname}
                tight={tight}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ flex: "none", display: "flex", gap: 3, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r3)", padding: 3, margin: "8px 0", boxSizing: "border-box", flexDirection: tight ? "column" : "row" }}>
        {THEME_MODES.map(([choice, label, short, icon]) => {
          const active = mode === choice
          return (
            <span
              key={choice}
              onClick={() => setMode(choice)}
              title={label}
              style={{
                flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0",
                borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer",
                ...(active ? { background: "var(--shell)", color: "var(--txt)" } : { color: "var(--txt-4)" }),
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d={icon} /></svg>
              {!tight && short}
            </span>
          )
        })}
      </div>

      <a
        href="https://attomik.co"
        target="_blank"
        rel="noopener"
        className="sh-credit"
        style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--txt-4)", textDecoration: "none", padding: "4px 12px 2px", flex: "none", display: "flex", alignItems: "center", justifyContent: tight ? "center" : "flex-start", gap: 7 }}
      >
        {!tight && "Built by"}
        <svg width="11" height="11" viewBox="0 0 77 77" fill="none" aria-hidden="true" style={{ flex: "none", opacity: 0.85 }}>
          <g transform="translate(-11.56 -7)" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
            <path d="M59.37 17.32A34 34 0 0 1 83.98 48.81" />
            <path d="M73.62 74.46A34 34 0 0 1 31.98 78.83" />
            <path d="M17.01 58.23A34 34 0 0 1 34.04 19.98" />
          </g>
          <g transform="translate(-11.56 -7)" fill="currentColor">
            <circle cx="50" cy="16" r="9" />
            <circle cx="79.44" cy="67" r="9" />
            <circle cx="20.56" cy="67" r="9" />
          </g>
        </svg>
        {!tight && "Attomik"}
      </a>
    </div>
  )
}

/** Workspace mark: uploaded logo for the active ground, else placeholder. */
function WorkspaceMark({ workspace }: { workspace: ShellWorkspace }) {
  const { logoLightUrl, logoDarkUrl, name } = workspace
  const img = (src: string, cls?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={cls ?? src} src={src} alt={`${name} logo`} className={cls} style={{ height: 30, width: "auto", maxWidth: 176, objectFit: "contain" }} />
  )

  if (logoLightUrl && logoDarkUrl) {
    return (
      <span style={{ height: 34, flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img(logoLightUrl, "sh-logo-light")}
        {img(logoDarkUrl, "sh-logo-dark")}
      </span>
    )
  }
  const only = logoLightUrl ?? logoDarkUrl
  if (only) {
    return (
      <span style={{ height: 34, flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img(only)}
      </span>
    )
  }
  return (
    <span style={{ height: 34, width: "100%", maxWidth: 176, border: "1px dashed var(--line-2)", borderRadius: "var(--r3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxSizing: "border-box" }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--line-2)", display: "block", flex: "none" }} />
      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--txt-4)" }}>Logo</span>
    </span>
  )
}
