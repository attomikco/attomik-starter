"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import type { NavigationItem } from "@/core/navigation"
import { NavIcon } from "./icons"

/**
 * One rail entry, ported from the reference `navItem()`:
 * active = card background + 3px accent bar + accent-text icon;
 * idle = weight 500, txt-2, hover lifts to card/txt (shell.css);
 * tight (collapsed) = centered icon, badge becomes a dot.
 */
export function NavItem({
  item,
  active,
  tight,
  badge,
  onNavigate,
}: {
  item: NavigationItem
  active: boolean
  tight: boolean
  badge?: string
  onNavigate?: () => void
}) {
  const base: CSSProperties = tight
    ? { display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 0", borderRadius: "var(--r3)", position: "relative", cursor: "pointer" }
    : { display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: "var(--r3)", fontSize: 15, position: "relative", cursor: "pointer" }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={active ? "sh-nav-item-active" : "sh-nav-item"}
      style={{ ...base, textDecoration: "none" }}
      title={tight ? item.label : undefined}
    >
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
        </>
      )}
      {tight && badge && (
        <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 999, background: "var(--accent)", display: "block" }} />
      )}
    </Link>
  )
}
