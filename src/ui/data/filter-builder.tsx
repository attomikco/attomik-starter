"use client"

import type { CSSProperties } from "react"
import { copy } from "@/core/i18n"
import type { FilterCondition, FilterFieldDef, FilterOperator } from "@/core/data/types"

/**
 * Filter builder panel from the reference ("Match all conditions").
 * Fields and value options are module-supplied; conditions are the
 * serializable FilterCondition shape a server API can consume as-is.
 * The prototype cycled values on click; production uses real (styled)
 * selects for accessibility.
 */

const selectStyle: CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 8,
  padding: "9px 12px", fontSize: 13.5, minWidth: 132, color: "var(--txt)",
  appearance: "none", WebkitAppearance: "none", cursor: "pointer",
}

const OPERATORS: FilterOperator[] = ["equals", "not_equals", "contains", "is_empty", "is_not_empty", "gte", "lte"]

export function FilterBuilder({
  fields,
  conditions,
  onChange,
  onClear,
}: {
  fields: FilterFieldDef[]
  conditions: FilterCondition[]
  onChange: (conditions: FilterCondition[]) => void
  onClear: () => void
}) {
  const fieldFor = (key: string) => fields.find((f) => f.key === key) ?? fields[0]

  const update = (i: number, patch: Partial<FilterCondition>) => {
    const list = conditions.slice()
    list[i] = { ...list[i], ...patch }
    onChange(list)
  }

  const operatorsFor = (f: FilterFieldDef): FilterOperator[] =>
    f.kind === "number" ? ["equals", "not_equals", "gte", "lte"] : OPERATORS.filter((o) => o !== "gte" && o !== "lte")

  return (
    <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: 18, flex: "none", animation: "sh-rise .16s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>{copy.data.matchAll}</span>
        <span style={{ height: 1, background: "var(--line)", flex: 1, display: "block" }} />
        <button className="ui-btn" onClick={onClear} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)" }}>{copy.data.clearAll}</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {conditions.map((c, i) => {
          const field = fieldFor(c.field)
          const noValue = c.op === "is_empty" || c.op === "is_not_empty"
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)", width: 34, flex: "none" }}>{i === 0 ? copy.data.where : copy.data.and}</span>

              <select aria-label={copy.data.filterField} style={selectStyle} value={c.field}
                onChange={(e) => {
                  const next = fieldFor(e.target.value)
                  update(i, { field: next.key, op: next.kind === "number" ? "gte" : "equals", value: next.options?.[0] ?? "" })
                }}>
                {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>

              <select aria-label={copy.data.filterOperator} style={{ ...selectStyle, minWidth: 108, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }} value={c.op}
                onChange={(e) => update(i, { op: e.target.value as FilterOperator })}>
                {operatorsFor(field).map((o) => <option key={o} value={o}>{copy.data.operators[o]}</option>)}
              </select>

              {!noValue && (field.options ? (
                <select aria-label={copy.data.filterValue} style={{ ...selectStyle, minWidth: 148 }} value={c.value}
                  onChange={(e) => update(i, { value: e.target.value })}>
                  {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input aria-label={copy.data.filterValue} value={c.value} onChange={(e) => update(i, { value: e.target.value })}
                  inputMode={field.kind === "number" ? "decimal" : undefined}
                  style={{ ...selectStyle, minWidth: 148, cursor: "text" }} />
              ))}

              <button className="ui-btn" aria-label={copy.data.removeCondition} onClick={() => onChange(conditions.filter((_, j) => j !== i))}
                style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--txt-4)" }}>
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <button className="ui-btn" onClick={() => {
        const f = fields[0]
        onChange(conditions.concat([{ field: f.key, op: f.kind === "number" ? "gte" : "equals", value: f.options?.[0] ?? "" }]))
      }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "9px 16px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        {copy.data.addCondition}
      </button>
    </div>
  )
}
