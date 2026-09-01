"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { ActivityEvent } from "@/core/audit"
import { eventTone, eventVerb, summarizeEvent } from "@/core/audit/summaries"
import { pageCount, pageSummary } from "@/core/data/query"
import { DataTable, ToneChip } from "@/ui/data/data-table"
import { SearchInput } from "@/ui/data/table-controls"
import { Listbox } from "@/ui/forms/select"

/**
 * Activity screen, ported from the reference activity/audit patterns:
 * filterable event table (Task 007 primitives) with the right-side diff
 * drawer (what changed → before/after, then context). Search, filters and
 * pagination are SERVER-SIDE — the URL carries the query and the server
 * re-renders the page; the full history never loads client-side.
 */

const ACTION_OPTIONS: [string, string][] = [
  ["", "All events"],
  ["workspace.settings.updated", "Settings updated"],
  ["workspace.branding.updated", "Branding updated"],
  ["workspace.member.added", "Member added"],
  ["workspace.member.role_changed", "Role changed"],
  ["workspace.member.removed", "Member removed"],
  ["workspace.invitation.created", "Invitation created"],
  ["workspace.invitation.resent", "Invitation resent"],
  ["workspace.invitation.revoked", "Invitation revoked"],
  ["workspace.invitation.accepted", "Invitation accepted"],
  ["workspace.created", "Workspace created"],
]

export function ActivityScreen({
  events,
  total,
  page,
  pageSize,
  actorEmails,
  members,
  filters,
}: {
  events: ActivityEvent[]
  total: number
  page: number
  pageSize: number
  actorEmails: Record<string, string>
  members: { userId: string; email: string }[]
  filters: { q: string; action: string; actor: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(filters.q)
  const [detail, setDetail] = useState<ActivityEvent | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = (next: Partial<{ q: string; action: string; actor: string; page: number }>) => {
    const params = new URLSearchParams()
    const merged = { q, action: filters.action, actor: filters.actor, page: 1, ...next }
    if (merged.q) params.set("q", merged.q)
    if (merged.action) params.set("action", merged.action)
    if (merged.actor) params.set("actor", merged.actor)
    if (merged.page > 1) params.set("page", String(merged.page))
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`)
  }

  useEffect(() => {
    if (q === filters.q) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => navigate({ q }), 350)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const actorLabel = (e: ActivityEvent) =>
    e.actorUserId ? (actorEmails[e.actorUserId] ?? "former member") : "System"

  const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`

  const columns = [
    { key: "when", label: "When", width: 128, mono: true, text: (e: ActivityEvent) => when(e.createdAt) },
    {
      key: "event", label: "Event", width: 132,
      render: (e: ActivityEvent) => <ToneChip tone={eventTone(e.action)} label={eventVerb(e.action)} />,
    },
    {
      key: "summary", label: "What happened", flex: true,
      render: (e: ActivityEvent) => (
        <span style={{ fontSize: 13.5, color: "var(--txt)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          {summarizeEvent({ action: e.action, resourceLabel: e.resourceLabel, before: e.before, after: e.after }, actorLabel(e))}
        </span>
      ),
    },
    { key: "resource", label: "Resource", width: 128, mono: true, text: (e: ActivityEvent) => e.resourceType },
  ]

  const state = { page, pageSize, total }

  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", flex: "none" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>Workspace · audit</div>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>Activity</h1>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>
            Every meaningful change in this workspace · retained indefinitely
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "none" }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search events" />
        <Listbox
          ariaLabel="Event type"
          value={filters.action}
          options={ACTION_OPTIONS.map(([value, label]) => ({ value, label }))}
          onChange={(action) => navigate({ action })}
          minWidth={168}
        />
        <Listbox
          ariaLabel="Actor"
          value={filters.actor}
          options={[{ value: "", label: "Everyone" }, ...members.map((m) => ({ value: m.userId, label: m.email }))]}
          onChange={(actor) => navigate({ actor })}
          minWidth={150}
        />
      </div>

      <DataTable<ActivityEvent>
        columns={columns}
        rows={events}
        rowKey={(e) => e.id}
        onRowClick={setDetail}
        state="ready"
        empty={{ title: "No activity yet", body: "Meaningful changes — settings, members, invitations — will appear here as they happen." }}
        footerText={pageSummary(state, events.length)}
        pagination={{ page, pageCount: pageCount(state), onPage: (p) => navigate({ page: p }) }}
      />

      {detail && (
        <EventDrawer event={detail} actor={actorLabel(detail)} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}

/** Right-side diff drawer, ported from the reference audit drawer. */
function EventDrawer({ event, actor, onClose }: { event: ActivityEvent; actor: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose])

  const keys = [...new Set([...Object.keys(event.before ?? {}), ...Object.keys(event.after ?? {})])]
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v))
  const context: [string, string][] = [
    ["Actor", actor],
    ["Action", event.action],
    ["Resource", event.resourceType],
    ...(event.resourceLabel ? [["Label", event.resourceLabel] as [string, string]] : []),
    ...(event.resourceId ? [["Resource id", event.resourceId] as [string, string]] : []),
    ["Event id", event.id],
    ["At", event.createdAt],
  ]

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(8,10,14,.32)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Event detail"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "calc(100% - 40px)", zIndex: 71, background: "var(--card)", borderLeft: "1px solid var(--line)", boxShadow: "-20px 0 60px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "sh-rise .18s ease-out" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }}>
                {event.createdAt.slice(0, 10)} · {event.createdAt.slice(11, 19)}
              </div>
              <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {summarizeEvent({ action: event.action, resourceLabel: event.resourceLabel, before: event.before, after: event.after }, actor)}
              </div>
            </div>
            <button className="ui-btn" aria-label="Close" onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", color: "var(--txt-2)", flex: "none" }}>
              ✕
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <ToneChip tone={eventTone(event.action)} label={eventVerb(event.action)} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)" }}>{event.resourceType}</span>
          </div>
        </div>

        <div className="sh-scroll" style={{ flex: 1, minHeight: 0, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {keys.length > 0 && (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>What changed</div>
              <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden" }}>
                {keys.map((k, i) => (
                  <div key={k} style={{ padding: "12px 16px", borderBottom: i < keys.length - 1 ? "1px solid var(--line)" : undefined }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }}>{k}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--bad)", background: "var(--bad-tint)", borderRadius: 6, padding: "3px 8px", overflowWrap: "anywhere" }}>{fmt(event.before?.[k])}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-4)" }}>→</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ok)", background: "var(--ok-tint)", borderRadius: 6, padding: "3px 8px", overflowWrap: "anywhere" }}>{fmt(event.after?.[k])}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(event.metadata).length > 0 && (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>Metadata</div>
              <pre style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-2)", background: "var(--shell)", borderRadius: "var(--r3)", padding: "12px 14px", overflowX: "auto" }}>
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>Context</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {context.map(([label, value], i) => (
                <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "8px 0", borderBottom: i < context.length - 1 ? "1px solid var(--line)" : undefined }}>
                  <span style={{ fontSize: 13, color: "var(--txt-2)", flex: "none", width: 96 }}>{label}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt)", flex: 1, minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
