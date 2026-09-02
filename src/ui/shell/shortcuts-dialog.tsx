"use client"

import { useCopy } from "@/core/i18n/client"

/**
 * ⌘/ shortcuts sheet, ported from the reference host. Only shell-level
 * groups are listed while product modules are unported; the reference's
 * Table and Decide groups return with the modules that own them.
 */
export function ShortcutsDialog({
  goRows,
  onClose,
}: {
  goRows: [label: string, keys: string][]
  onClose: () => void
}) {
  const copy = useCopy()
  const groups: [string, [string, string][]][] = [
    [copy.shortcuts.anywhere, [[copy.shortcuts.commandPalette, "⌘ K"], [copy.shortcuts.shortcuts, "⌘ /"], [copy.shortcuts.collapseSidebar, "⌘ B"], [copy.shortcuts.closeAnything, "Esc"]]],
    ...(goRows.length > 0 ? [[copy.shortcuts.move, goRows] as [string, [string, string][]]] : []),
  ]

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 97, background: "rgba(8,10,14,.34)", display: "grid", placeItems: "center" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 660, maxWidth: "calc(100% - 32px)", maxHeight: "82%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "0 30px 70px rgba(0,0,0,.3)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "sh-rise .14s ease-out" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <span style={{ fontSize: 18, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.025em", flex: 1 }}>{copy.shortcuts.title}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px" }}>ESC</span>
        </div>
        <div className="sh-scroll" style={{ flex: 1, minHeight: 0, padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
          {groups.map(([label, rows]) => (
            <div key={label} style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>{label}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {rows.map(([rowLabel, keys], i) => (
                  <div key={rowLabel} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : undefined }}>
                    <span style={{ fontSize: 13.5, color: "var(--txt-2)", flex: 1, minWidth: 0 }}>{rowLabel}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt)", background: "var(--shell)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 9px", flex: "none" }}>{keys}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", flex: "none" }}>
          {copy.shortcuts.footer}
        </div>
      </div>
    </div>
  )
}
