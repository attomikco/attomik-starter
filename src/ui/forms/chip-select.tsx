"use client"

import { useEffect, useRef, useState } from "react"
import { Listbox } from "./select"

/**
 * A choice group as chips (docs/UI_STANDARDS.md, Forms).
 *
 * `mode="single"` is a segmented control: one row of options, one selected.
 * The rule is that every option fits on one line; the component measures
 * itself and, when an option would wrap at the width it renders, falls back
 * to a Listbox with the same values. `data-segmented` marks the measured
 * row for the audit.
 *
 * `mode="multi"` is a wrapping row of toggle chips (containers on a
 * service, materials to add); wrapping is the point there, and the audit
 * skips `data-chips`.
 */

export interface ChipOption<T extends string> { value: T; label: string }

const chip = (on: boolean, disabled: boolean): React.CSSProperties => ({
  borderRadius: 999, padding: "8px 14px", fontSize: 13.5, fontWeight: "var(--w-semi)" as never, whiteSpace: "nowrap", cursor: disabled ? "default" : "pointer", boxSizing: "border-box",
  border: `1.5px solid ${on ? "var(--accent)" : "var(--line-2)"}`, background: on ? "var(--accent-tint)" : "var(--card)", color: on ? "var(--accent-text)" : "var(--txt-2)", opacity: disabled ? 0.6 : 1,
})

export function ChipSelect<T extends string>(props:
  | { mode?: "single"; ariaLabel: string; options: ChipOption<T>[]; value: T; onChange: (v: T) => void; disabled?: boolean; mono?: boolean }
  | { mode: "multi"; ariaLabel: string; options: ChipOption<T>[]; values: T[]; onToggle: (v: T) => void; disabled?: boolean; mono?: boolean },
) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [wraps, setWraps] = useState(false)
  const single = props.mode !== "multi"

  useEffect(() => {
    if (!single) return
    const el = rowRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const measure = () => {
      const tops = new Set(Array.from(el.querySelectorAll<HTMLElement>("button")).map((b) => b.offsetTop))
      setWraps(tops.size > 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [single, props.options.length])

  if (single && wraps) {
    const p = props as Extract<typeof props, { mode?: "single" }>
    return <Listbox ariaLabel={p.ariaLabel} fullWidth value={p.value} options={p.options} onChange={(v) => p.onChange(v as T)} disabled={p.disabled} />
  }

  const font = props.mono ? { fontFamily: "var(--mono)" } : {}
  if (single) {
    const p = props as Extract<typeof props, { mode?: "single" }>
    return (
      <div ref={rowRef} role="group" aria-label={p.ariaLabel} data-segmented style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {p.options.map((o) => (
          <button key={o.value} type="button" className="ui-btn" aria-pressed={o.value === p.value} disabled={p.disabled} onClick={() => p.onChange(o.value)} style={{ ...chip(o.value === p.value, !!p.disabled), ...font }}>{o.label}</button>
        ))}
      </div>
    )
  }
  const p = props as Extract<typeof props, { mode: "multi" }>
  return (
    <div role="group" aria-label={p.ariaLabel} data-chips style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {p.options.map((o) => {
        const on = p.values.includes(o.value)
        return <button key={o.value} type="button" className="ui-btn" aria-pressed={on} disabled={p.disabled} onClick={() => p.onToggle(o.value)} style={{ ...chip(on, !!p.disabled), ...font }}>{o.label}</button>
      })}
    </div>
  )
}
