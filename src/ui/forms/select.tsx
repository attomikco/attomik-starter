"use client"

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react"

/**
 * Canonical themed Listbox — the one dropdown primitive (select-only
 * combobox pattern). Fully token-styled so the open panel is part of the
 * application in every theme/skin, unlike native <select> menus.
 *
 * Semantics: trigger is role="combobox" with aria-expanded/aria-controls/
 * aria-activedescendant; the panel is role="listbox" with role="option"
 * rows. Focus never leaves the trigger, so keyboard users keep a
 * focus-visible ring while mouse users get none after closing (the
 * trigger is a real <button>, where browsers apply :focus-visible
 * correctly — the fix for the lingering ring native selects caused).
 * Keyboard: ArrowUp/Down, Home/End, Enter/Space, Escape; outside click
 * closes; the active option scrolls into view.
 */

export interface ListboxOption {
  value: string
  label: string
}

export function Listbox({
  value,
  options,
  onChange,
  ariaLabel,
  minWidth = 132,
  disabled = false,
  fullWidth = false,
  triggerStyle,
}: {
  value: string
  options: ListboxOption[]
  onChange: (value: string) => void
  ariaLabel: string
  minWidth?: number
  disabled?: boolean
  fullWidth?: boolean
  triggerStyle?: CSSProperties
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options[selectedIndex] ?? options[0]
  const optionId = (i: number) => `${listId}-opt-${i}`

  const openList = () => {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  const commit = (i: number) => {
    setOpen(false)
    const next = options[i]
    if (next && next.value !== value) onChange(next.value)
  }

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[id="${optionId(activeIndex)}"]`)
      ?.scrollIntoView({ block: "nearest" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (!open) return openList()
        setActiveIndex((i) => Math.min(options.length - 1, i + 1))
        break
      case "ArrowUp":
        e.preventDefault()
        if (!open) return openList()
        setActiveIndex((i) => Math.max(0, i - 1))
        break
      case "Home":
        if (open) { e.preventDefault(); setActiveIndex(0) }
        break
      case "End":
        if (open) { e.preventDefault(); setActiveIndex(options.length - 1) }
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (!open) openList()
        else commit(activeIndex)
        break
      case "Escape":
        if (open) { e.stopPropagation(); setOpen(false) }
        break
      case "Tab":
        setOpen(false)
        break
    }
  }

  const baseTrigger: CSSProperties = useMemo(
    () => ({
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      background: "var(--card)", border: `1px solid ${open ? "var(--accent)" : "var(--line-2)"}`,
      borderRadius: "var(--r3)", padding: "9px 12px", fontSize: 13, color: "var(--txt)",
      minWidth, width: fullWidth ? "100%" : undefined, boxSizing: "border-box", cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.6 : 1, textAlign: "left",
      ...triggerStyle,
    }),
    [open, minWidth, disabled, fullWidth, triggerStyle],
  )

  return (
    <div ref={wrapRef} style={{ position: "relative", display: fullWidth ? "block" : "inline-block" }}>
      <button
        type="button"
        className="ui-btn"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        style={baseTrigger}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected?.label ?? ""}</span>
        <span aria-hidden style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt-4)", flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }}>▾</span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="sh-scroll"
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: "100%", zIndex: 40, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)", boxShadow: "0 18px 40px rgba(0,0,0,.14)", padding: 6, maxHeight: 268, animation: "sh-rise .12s ease-out" }}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            const isActive = i === activeIndex
            return (
              <div
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(i)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: "var(--r3)", fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
                  color: isSelected ? "var(--txt)" : "var(--txt-2)",
                  fontWeight: (isSelected ? "var(--w-semi)" : 400) as never,
                  background: isActive ? "var(--accent-tint)" : "transparent",
                  ...(isActive ? { color: "var(--accent-text)" } : {}) }}
              >
                {o.label}
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginLeft: "auto" }}><path d="m5 13 5 5L20 7" /></svg>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
