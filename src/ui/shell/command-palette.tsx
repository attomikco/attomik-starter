"use client"

import { useEffect, useRef, useState } from "react"
import { filterPaletteGroups, type PaletteGroup } from "./helpers"

/**
 * ⌘K palette, ported from the reference host. Destinations come from the
 * enabled module registry (built in app-shell-client) — never a second
 * navigation dataset. Drops from near the search field it replaces.
 */
export function CommandPalette({
  groups,
  mobile,
  onClose,
}: {
  groups: PaletteGroup[]
  mobile: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  const visible = filterPaletteGroups(groups, query)

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 95, background: "rgba(8,10,14,.22)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: mobile ? 72 : "14vh", left: "50%", transform: "translateX(-50%)",
          width: mobile ? "calc(100% - 32px)" : 580, maxWidth: "calc(100% - 32px)",
          background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)",
          boxShadow: "0 30px 70px rgba(0,0,0,.3)", overflow: "hidden", animation: "sh-rise-center .14s ease-out",
        }}
      >
        <div className="sh-palette-search" style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="2" strokeLinecap="round" style={{ flex: "none" }}><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>
          <input
            ref={inputRef}
            placeholder="Search screens and actions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 0, fontSize: 15.5 }}
          />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 7px", flex: "none" }}>ESC</span>
        </div>
        <div className="sh-scroll" style={{ maxHeight: 380, padding: 10 }}>
          {visible.map((g) => (
            <div key={g.label} style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", padding: "8px 12px 6px" }}>{g.label}</div>
              {g.items.map((item) => (
                <div key={item.label} className="sh-pick" onClick={() => item.run()}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: "var(--r3)", fontSize: 14.5, color: "var(--txt-2)", cursor: "pointer" }}>
                  {item.label}
                  <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>{item.hint ?? ""}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
