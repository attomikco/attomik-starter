import type { ReactNode } from "react"

/**
 * A square icon-only button for row actions that only remove or dismiss
 * (docs/UI_STANDARDS.md, CTA hierarchy). The label is the accessible name
 * and the tooltip; the default icon is the ✕ "remove" cross.
 */
export function IconButton({ label, onClick, icon = "remove", tone = "neutral", disabled, size = 30 }: {
  label: string
  onClick: () => void
  icon?: "remove" | ReactNode
  tone?: "neutral" | "bad"
  disabled?: boolean
  size?: number
}) {
  return (
    <button type="button" className="ui-btn sh-pick" aria-label={label} title={label} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{ width: size, height: size, borderRadius: "var(--r3)", display: "grid", placeItems: "center", flex: "none", color: tone === "bad" ? "var(--bad)" : "var(--txt-4)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      {icon === "remove"
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        : icon}
    </button>
  )
}
