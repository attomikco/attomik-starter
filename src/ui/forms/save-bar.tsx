"use client"

/**
 * Explicit-save footer + unsaved-changes pill, ported from part-records.
 * Standard CRUD forms use explicit Save; Appearance's autosave is the
 * documented exception, not the pattern.
 */

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "error"

export function UnsavedChangesPill() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--warn)", background: "var(--warn-tint)", borderRadius: 999, padding: "6px 12px" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--warn-fill)", display: "block" }} />
      Unsaved changes
    </span>
  )
}

export function SaveBar({
  state,
  hint,
  errorMessage,
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  discardLabel = "Discard",
}: {
  state: SaveState
  hint?: string
  errorMessage?: string
  onSave: () => void
  onDiscard?: () => void
  saveLabel?: string
  discardLabel?: string
}) {
  const disabled = state === "clean" || state === "saving" || state === "saved"
  const hintText =
    state === "error" ? (errorMessage ?? "Could not save") :
    state === "saving" ? "Saving…" :
    state === "dirty" ? "Unsaved edits on this record" :
    state === "saved" ? "All changes saved" :
    hint ?? "No changes yet"

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
      <span role={state === "error" ? "alert" : undefined}
        style={{ fontFamily: "var(--mono)", fontSize: 11, color: state === "error" ? "var(--bad)" : state === "dirty" ? "var(--warn)" : "var(--txt-4)" }}>
        {hintText}
      </span>
      <div style={{ flex: 1 }} />
      {onDiscard && (
        <button className="ui-btn sh-pick" onClick={onDiscard} disabled={state === "saving"}
          style={{ fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "11px 20px" }}>
          {discardLabel}
        </button>
      )}
      <button className="ui-btn" onClick={onSave} disabled={disabled} aria-disabled={disabled}
        style={{ fontSize: 14.5, fontWeight: "var(--w-semi)" as never, borderRadius: 999, padding: "12px 22px",
          ...(disabled
            ? { background: "var(--shell)", color: "var(--txt-4)", cursor: "default" }
            : { background: "var(--accent)", color: "var(--accent-ink)" }) }}>
        {state === "saving" ? "Saving…" : saveLabel}
      </button>
    </div>
  )
}
