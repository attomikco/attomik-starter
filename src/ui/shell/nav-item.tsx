"use client"

import Link from "next/link"
import { useState, type CSSProperties } from "react"
import type { NavigationItem } from "@/core/navigation"
import { isNavActive } from "./helpers"
import { NavIcon } from "./icons"

/**
 * One rail entry, ported from the reference `navItem()`:
 * active = card background + 3px accent bar + accent-text icon;
 * idle = weight 500, txt-2, hover lifts to card/txt (shell.css);
 * tight (collapsed) = centered icon, badge becomes a dot.
 *
 * Items with `children` render the reference submenu: the parent row
 * toggles the child list (auto-open while a child route is active), and
 * child rows carry the 4px dot indicator. Children come from the registry —
 * never hardcoded here.
 */
export function NavItem({
  item,
  pathname,
  tight,
  badge,
  onNavigate,
}: {
  item: NavigationItem
  pathname: string
  tight: boolean
  badge?: string
  onNavigate?: () => void
}) {
  const children = item.children ?? []
  const hasKids = children.length > 0
  const childActive = hasKids && children.some((c) => isNavActive(pathname, c.href))
  const active = hasKids ? childActive : isNavActive(pathname, item.href)
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const open = manualOpen ?? childActive

  const base: CSSProperties = tight
    ? { display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 0", borderRadius: "var(--r3)", position: "relative", cursor: "pointer" }
    : { display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: "var(--r3)", fontSize: 15, position: "relative", cursor: "pointer" }

  const rowInner = (
    <>
      {active && (
        <span style={{ position: "absolute", left: -10, top: 11, bottom: 11, width: 3, borderRadius: "0 3px 3px 0", background: "var(--accent)", display: "block" }} />
      )}
      <NavIcon icon={item.icon} stroke={active ? "var(--accent-text)" : "var(--txt-3)"} />
      {!tight && (
        <>
          {item.label}
          {badge && (
            <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "3px 8px" }}>
              {badge}
            </span>
          )}
          {hasKids && (
            <span aria-hidden style={{ marginLeft: badge ? 0 : "auto", fontFamily: "var(--mono)", fontSize: 9, color: "var(--txt-4)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .12s" }}>
              ▾
            </span>
          )}
        </>
      )}
      {tight && badge && (
        <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 999, background: "var(--accent)", display: "block" }} />
      )}
    </>
  )

  const rowStyle = { ...base, textDecoration: "none", width: "100%", boxSizing: "border-box" as const }
  const rowClass = active ? "sh-nav-item-active" : "sh-nav-item"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {hasKids && !tight ? (
        <button className={`ui-btn ${rowClass}`} aria-expanded={open} onClick={() => setManualOpen(open ? false : true)} style={rowStyle}>
          {rowInner}
        </button>
      ) : (
        <Link
          href={hasKids ? children[0].href : item.href}
          onClick={onNavigate}
          className={rowClass}
          style={rowStyle}
          aria-current={active ? "page" : undefined}
          title={tight ? item.label : undefined}
        >
          {rowInner}
        </Link>
      )}

      {hasKids && !tight && open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "2px 0 6px 30px" }}>
          {children.map((c) => {
            const on = isNavActive(pathname, c.href)
            return (
              <Link key={c.href} href={c.href} onClick={onNavigate} className="sh-subnav-item" aria-current={on ? "page" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, fontSize: 13.5, cursor: "pointer", textDecoration: "none", color: on ? "var(--txt)" : "var(--txt-3)", fontWeight: (on ? "var(--w-semi)" : 400) as never }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, display: "block", flex: "none", background: on ? "var(--accent)" : "var(--line-2)" }} />
                {c.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
