"use client"

import Link from "next/link"
import { useState } from "react"
import { isDirty } from "@/core/data/query"
import { ToneChip } from "@/ui/data/data-table"
import { FormErrorBanner, RadioCards, TextArea, TextInput, SelectInput, Toggle } from "@/ui/forms/fields"
import { SaveBar, UnsavedChangesPill, type SaveState } from "@/ui/forms/save-bar"
import { ActionButton, RecordLayout, RecordSection } from "@/ui/records/record-layout"
import { ConfirmDialog, type ConfirmOptions } from "@/ui/records/confirm-dialog"
import { useToast } from "@/ui/shell/toast-provider"

/**
 * DEVELOPMENT DEMO — record layout + form primitives on the neutral Item
 * entity. Explicit save with dirty state (the standard CRUD pattern);
 * validation messages are specific, per the starter principle.
 */

interface Draft {
  name: string
  owner: string
  email: string
  status: string
  handling: string
  notify: boolean
  flag: boolean
  note: string
}

const SAVED: Draft = {
  name: "Northwind sync",
  owner: "Sam Whitfield",
  email: "sam@attomik.co",
  status: "Active",
  handling: "auto",
  notify: true,
  flag: false,
  note: "",
}

function validate(d: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (!d.name.trim()) errors.name = "A record needs a name on it."
  else if (d.name.trim().length < 2) errors.name = "That is too short to be a name."
  const email = d.email.trim()
  if (!email) errors.email = "An email is required — the run report goes there."
  else if (email.indexOf("@") < 0) errors.email = "Missing the @ — an address looks like name@company.com."
  else if (/\s/.test(email)) errors.email = "Addresses cannot contain spaces."
  else if (email.split("@")[1].indexOf(".") < 0) errors.email = "The domain needs a dot, like company.com."
  return errors
}

export function RecordDemo() {
  const { say } = useToast()
  const [tab, setTab] = useState("Overview")
  const [draft, setDraft] = useState<Draft>(SAVED)
  const [savedState, setSavedState] = useState<Draft>(SAVED)
  const [saving, setSaving] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)

  const errors = validate(draft)
  const dirty = isDirty(savedState, draft)
  const saveState: SaveState = saving ? "saving" : attempted && Object.keys(errors).length > 0 ? "error" : dirty ? "dirty" : "clean"

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))

  const save = () => {
    setAttempted(true)
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    window.setTimeout(() => {
      setSavedState(draft)
      setSaving(false)
      setAttempted(false)
      say("Record saved")
    }, 700)
  }

  return (
    <>
      <RecordLayout
        eyebrow="Development · demo record"
        title="Item IT-1012"
        status={<ToneChip tone="ok" label="Active" />}
        subtitle={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            Created Aug 28 by Sam Whitfield through the demo source.
            {dirty && <UnsavedChangesPill />}
          </span>
        }
        actions={
          <>
            <Link href="/dev/data" style={{ fontSize: 14, color: "var(--accent-text)", textDecoration: "none", marginRight: 6 }}>← Table demo</Link>
            <ActionButton label="Duplicate" onClick={() => say("Duplicated as IT-1013")} />
            <ActionButton label="Delete" tone="bad" onClick={() => setConfirm({
              tone: "bad", typedWord: "DELETE",
              title: "Delete this item?",
              body: "Deleting removes IT-1012 and its run history from reporting. There is no undo.",
              confirmLabel: "Delete permanently", cancelLabel: "Keep it",
              onConfirm: () => say("Item deleted"),
            })} />
          </>
        }
        tabs={[{ label: "Overview" }, { label: "Edit" }, { label: "Activity", count: 3 }]}
        activeTab={tab}
        onTab={setTab}
        aside={
          <>
            <div style={{ background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", borderRadius: "var(--r2)", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--accent-text)" }}>Amount</span>
              <div style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.045em", lineHeight: 1 }}>$486.00</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, borderTop: "1px solid var(--lead-line)", paddingTop: 14 }}>
                {[["Runs", "21"], ["Failures", "1"], ["Last run", "Aug 30"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, color: "var(--txt-2)" }}>
                    {k}<span style={{ fontFamily: "var(--mono)", color: "var(--txt)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <RecordSection title="Owner">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 999, background: "var(--card)", display: "grid", placeItems: "center", flex: "none", fontSize: 13.5, fontWeight: "var(--w-bold)" as never, color: "var(--txt-2)" }}>SW</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{savedState.owner}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)" }}>{savedState.email}</div>
                </div>
              </div>
            </RecordSection>
          </>
        }
      >
        {tab === "Overview" && (
          <RecordSection title="Details" meta="demo data">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[["Name", savedState.name], ["Status", savedState.status], ["Owner", savedState.owner], ["Handling", savedState.handling]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 6 }}>{k}</div>
                  <div style={{ fontSize: 14.5 }}>{v}</div>
                </div>
              ))}
            </div>
          </RecordSection>
        )}

        {tab === "Edit" && (
          <>
            {attempted && Object.keys(errors).length > 0 && (
              <FormErrorBanner title="This cannot be saved yet" body="Fix the fields marked below — each one says exactly what is wrong." />
            )}
            <RecordSection title="Details">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                <TextInput label="Name" required value={draft.name} onChange={(v) => patch({ name: v })}
                  error={attempted ? errors.name : undefined} valid={!errors.name && draft.name !== SAVED.name} />
                <TextInput label="Owner email" required value={draft.email} onChange={(v) => patch({ email: v })}
                  error={attempted ? errors.email : undefined} valid={!errors.email && draft.email !== SAVED.email}
                  hint="The run report goes to this address." />
                <SelectInput label="Status" value={draft.status} options={["Active", "Pending", "Failed", "Archived"]} onChange={(v) => patch({ status: v })} />
                <TextInput label="Owner" value={draft.owner} onChange={(v) => patch({ owner: v })} />
              </div>
            </RecordSection>
            <RecordSection title="Handling">
              <RadioCards
                value={draft.handling}
                onChange={(id) => patch({ handling: id })}
                options={[
                  { id: "auto", title: "Automatic", sub: "Runs on the schedule without review." },
                  { id: "review", title: "Review first", sub: "Holds each run for a manual check." },
                  { id: "manual", title: "Manual only", sub: "Never runs unless triggered by hand." },
                ]}
              />
              <div style={{ marginTop: 6 }}>
                <Toggle title="Email the owner" sub="Sends the note below with each run report." on={draft.notify} onToggle={() => patch({ notify: !draft.notify })} />
                <Toggle title="Flag for review" sub="Appears in the weekly operations report." on={draft.flag} onToggle={() => patch({ flag: !draft.flag })} last />
              </div>
            </RecordSection>
            <RecordSection title="Note">
              <TextArea value={draft.note} onChange={(v) => patch({ note: v })} placeholder="Two sentences is plenty."
                maxLength={280} counterNote="Plain language, no internal codes" />
            </RecordSection>
            <SaveBar state={saveState} errorMessage="Fix the marked fields first" onSave={save}
              onDiscard={() => { setDraft(savedState); setAttempted(false) }} />
          </>
        )}

        {tab === "Activity" && (
          <RecordSection title="Activity">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[["Status set to active", "today · 09:14", true], ["Run completed", "Aug 28 · 11:26", false], ["Record created", "Aug 28 · 11:24", false]].map(([title, when, on], i, arr) => (
                <div key={String(title)} style={{ display: "flex", gap: 14, minWidth: 0 }}>
                  <div style={{ width: 10, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, flex: "none", display: "block", background: on ? "var(--accent)" : "var(--line-2)" }} />
                    {i < arr.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--line-2)", display: "block" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em", marginTop: -3 }}>{title}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 6 }}>{when}</div>
                  </div>
                </div>
              ))}
            </div>
          </RecordSection>
        )}
      </RecordLayout>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
