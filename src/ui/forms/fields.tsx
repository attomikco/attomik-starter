"use client"

import { useId, type CSSProperties, type ReactNode } from "react"
import { Listbox } from "./select"

/**
 * Canonical form primitives, ported from part-records.dc.html. All colors
 * are theme tokens; validation messages are supplied by the caller and
 * SPECIFIC ("Missing the @ — …"), never generic. Labels are real <label>s
 * wired by id; every control is keyboard reachable.
 */

const labelStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }

export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", minWidth: 0 }}>
      <span style={labelStyle}>
        {label}
        {required && <span aria-hidden style={{ color: "var(--bad)" }}>*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, color: "var(--bad)", marginTop: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
          {error}
        </span>
      )}
      {!error && hint && <span style={{ display: "block", fontSize: 12, color: "var(--txt-3)", marginTop: 7 }}>{hint}</span>}
    </label>
  )
}

function fieldFrame(state: "idle" | "invalid" | "valid"): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10, background: "var(--card)", borderRadius: "var(--r3)",
    padding: "12px 14px", boxSizing: "border-box",
    border: `1.5px solid ${state === "invalid" ? "var(--bad)" : "var(--line-2)"}`,
  }
}

export function TextInput({
  label, required, value, onChange, onBlur, placeholder, error, hint, valid, type = "text",
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  hint?: string
  valid?: boolean
  type?: string
}) {
  const id = useId()
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id}>
      <span style={fieldFrame(error ? "invalid" : valid ? "valid" : "idle")}>
        <input id={id} type={type} value={value} placeholder={placeholder} aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          style={{ fontSize: 14.5, flex: 1, minWidth: 0 }} />
        {error && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2.2" strokeLinecap="round" style={{ flex: "none" }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>}
        {!error && valid && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="m5 13 5 5L20 7" /></svg>}
      </span>
    </Field>
  )
}

export function TextArea({
  label, required, value, onChange, placeholder, rows = 3, maxLength, counterNote, error, hint,
}: {
  label?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  counterNote?: string
  error?: string
  hint?: string
}) {
  const id = useId()
  const area = (
    <>
      <span style={{ display: "block", background: "var(--card)", border: `1.5px solid ${error ? "var(--bad)" : "var(--line-2)"}`, borderRadius: "var(--r3)", padding: "14px 16px" }}>
        <textarea id={id} rows={rows} value={value} placeholder={placeholder} maxLength={maxLength} aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: 14, lineHeight: 1.55, width: "100%", display: "block" }} />
      </span>
      {(maxLength || counterNote) && (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>
            {maxLength ? `${value.length} / ${maxLength}` : `${value.length} characters`}
          </span>
          {counterNote && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>{counterNote}</span>}
        </span>
      )}
    </>
  )
  return label ? <Field label={label} required={required} error={error} hint={hint} htmlFor={id}>{area}</Field> : <span style={{ display: "block" }}>{area}</span>
}

export function SelectInput({
  label, required, value, options, onChange, error, hint,
}: {
  label: string
  required?: boolean
  value: string
  options: string[]
  onChange: (v: string) => void
  error?: string
  hint?: string
}) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <Listbox
        ariaLabel={label}
        value={value}
        options={options.map((o) => ({ value: o, label: o }))}
        onChange={onChange}
        fullWidth
        triggerStyle={{ borderRadius: "var(--r3)", borderWidth: 1.5, borderColor: error ? "var(--bad)" : undefined, padding: "12px 14px", fontSize: 14.5 }}
      />
    </Field>
  )
}

export function Toggle({
  title, sub, on, onToggle, last,
}: {
  title: string
  sub?: string
  on: boolean
  onToggle: () => void
  last?: boolean
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "14px 0", borderBottom: last ? undefined : "1px solid var(--line)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--txt-3)", marginTop: 3 }}>{sub}</div>}
      </div>
      <button type="button" className="ui-btn" role="switch" aria-checked={on} aria-label={title} onClick={onToggle}
        style={{ width: 42, height: 25, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", padding: 3, boxSizing: "border-box", justifyContent: on ? "flex-end" : "flex-start", background: on ? "var(--accent)" : "var(--line-2)" }}>
        <span style={{ width: 19, height: 19, borderRadius: 999, display: "block", background: on ? "var(--accent-ink)" : "var(--card)" }} />
      </button>
    </div>
  )
}

export function Checkbox({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="ui-btn" role="checkbox" aria-checked={on} onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--txt-2)" }}>
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, flex: "none", display: "grid", placeItems: "center", fontSize: 11, boxSizing: "border-box",
        ...(on ? { background: "var(--accent)", color: "var(--accent-ink)", border: "1.5px solid var(--accent)" } : { border: "1.5px solid var(--line-2)", color: "transparent" }) }}>
        {on ? "✓" : ""}
      </span>
      {label}
    </button>
  )
}

/** Radio cards from the reference ("Refund handling" methods). */
export function RadioCards({
  options, value, onChange, columns = 3,
}: {
  options: { id: string; title: string; sub?: string }[]
  value: string
  onChange: (id: string) => void
  columns?: number
}) {
  return (
    <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${columns >= 3 ? 180 : 220}px, 1fr))`, gap: 12 }}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <button type="button" key={o.id} className="ui-btn" role="radio" aria-checked={on} onClick={() => onChange(o.id)}
            style={{ borderRadius: "var(--r3)", padding: 16, minWidth: 0, boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`, display: "block" }}>
            <span aria-hidden style={{ width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", boxSizing: "border-box", border: `1.5px solid ${on ? "var(--accent-text)" : "var(--line-2)"}` }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, display: "block", background: on ? "var(--accent-text)" : "transparent" }} />
            </span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em", marginTop: 12 }}>{o.title}</span>
            {o.sub && <span style={{ display: "block", fontSize: 12.5, color: "var(--txt-2)", marginTop: 4, lineHeight: 1.45 }}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Error summary banner from the reference form ("showFormError"). */
export function FormErrorBanner({ title, body }: { title: string; body?: string }) {
  return (
    <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--bad-tint)", borderRadius: "var(--r2)", padding: "16px 18px", flex: "none", animation: "sh-rise .16s ease-out" }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--bad)" }}>{title}</div>
        {body && <div style={{ fontSize: 13.5, color: "var(--txt-2)", lineHeight: 1.5, marginTop: 3 }}>{body}</div>}
      </div>
    </div>
  )
}
