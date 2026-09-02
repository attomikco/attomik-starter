"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { ActivityEvent } from "@/core/audit"
import { eventTone, eventVerb, summarizeEvent } from "@/core/audit/summaries"
import { useCopy, useFormat, useT } from "@/core/i18n/client"
import { pageCount, pageSummary } from "@/core/data/query"
import { DataTable, ToneChip } from "@/ui/data/data-table"
import { SearchInput } from "@/ui/data/table-controls"
import { Listbox } from "@/ui/forms/select"
import { settingsCopy } from "../copy"

/**
 * Activity screen, ported from the reference activity/audit patterns:
 * filterable event table (Task 007 primitives) with the right-side diff
 * drawer (what changed → before/after, then context). Search, filters and
 * pagination are SERVER-SIDE — the URL carries the query and the server
 * re-renders the page; the full history never loads client-side.
 */

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
  const copy = useCopy()
  const t = useT(settingsCopy)
  const fmt = useFormat()
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
    e.actorUserId ? (actorEmails[e.actorUserId] ?? copy.audit.formerMember) : copy.audit.system

  const when = (iso: string) => fmt.dateTime(iso)

  const ACTION_OPTIONS: [string, string][] = [
    ["", t("settings.activity.action.all")],
    ["workspace.settings.updated", t("settings.activity.action.settingsUpdated")],
    ["workspace.branding.updated", t("settings.activity.action.brandingUpdated")],
    ["workspace.member.added", t("settings.activity.action.memberAdded")],
    ["workspace.member.role_changed", t("settings.activity.action.roleChanged")],
    ["workspace.member.removed", t("settings.activity.action.memberRemoved")],
    ["workspace.invitation.created", t("settings.activity.action.invitationCreated")],
    ["workspace.invitation.resent", t("settings.activity.action.invitationResent")],
    ["workspace.invitation.revoked", t("settings.activity.action.invitationRevoked")],
    ["workspace.invitation.accepted", t("settings.activity.action.invitationAccepted")],
    ["workspace.created", t("settings.activity.action.workspaceCreated")],
  ]

  const columns = [
    { key: "when", label: t("settings.activity.column.when"), width: 128, mono: true, text: (e: ActivityEvent) => when(e.createdAt) },
    {
      key: "event", label: t("settings.activity.column.event"), width: 132,
      render: (e: ActivityEvent) => <ToneChip tone={eventTone(e.action)} label={eventVerb(e.action)} />,
    },
    {
      key: "summary", label: t("settings.activity.column.summary"), flex: true,
      render: (e: ActivityEvent) => (
        <span style={{ fontSize: 13.5, color: "var(--txt)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          {summarizeEvent({ action: e.action, resourceLabel: e.resourceLabel, before: e.before, after: e.after }, actorLabel(e), copy.audit)}
        </span>
      ),
    },
    { key: "resource", label: t("settings.activity.column.resource"), width: 128, mono: true, text: (e: ActivityEvent) => e.resourceType },
  ]

  const state = { page, pageSize, total }

  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", flex: "none" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>{t("settings.activity.eyebrow")}</div>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.activity.title")}</h1>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>
            {t("settings.activity.intro")}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "none" }}>
        <SearchInput value={q} onChange={setQ} placeholder={t("settings.activity.search")} />
        <Listbox
          ariaLabel={t("settings.activity.filter.type")}
          value={filters.action}
          options={ACTION_OPTIONS.map(([value, label]) => ({ value, label }))}
          onChange={(action) => navigate({ action })}
          minWidth={168}
        />
        <Listbox
          ariaLabel={t("settings.activity.filter.actor")}
          value={filters.actor}
          options={[{ value: "", label: t("settings.activity.filter.everyone") }, ...members.map((m) => ({ value: m.userId, label: m.email }))]}
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
        empty={{ title: t("settings.activity.empty.title"), body: t("settings.activity.empty.body") }}
        footerText={pageSummary(state, events.length, copy.data, fmt.number)}
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
  const copy = useCopy()
  const t = useT(settingsCopy)
  const format = useFormat()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose])

  const keys = [...new Set([...Object.keys(event.before ?? {}), ...Object.keys(event.after ?? {})])]
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v))
  const context: [string, string][] = [
    [t("settings.activity.detail.actor"), actor],
    [t("settings.activity.detail.action"), event.action],
    [t("settings.activity.detail.resource"), event.resourceType],
    ...(event.resourceLabel ? [[t("settings.activity.detail.label"), event.resourceLabel] as [string, string]] : []),
    ...(event.resourceId ? [[t("settings.activity.detail.resourceId"), event.resourceId] as [string, string]] : []),
    [t("settings.activity.detail.eventId"), event.id],
    [t("settings.activity.detail.at"), format.dateTime(event.createdAt)],
  ]

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(8,10,14,.32)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t("settings.activity.detail.title")}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "calc(100% - 40px)", zIndex: 71, background: "var(--card)", borderLeft: "1px solid var(--line)", boxShadow: "-20px 0 60px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "sh-rise .18s ease-out" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 8 }}>
                {event.createdAt.slice(0, 10)} · {event.createdAt.slice(11, 19)}
              </div>
              <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {summarizeEvent({ action: event.action, resourceLabel: event.resourceLabel, before: event.before, after: event.after }, actor, copy.audit)}
              </div>
            </div>
            <button className="ui-btn" aria-label={t("settings.activity.detail.close")} onClick={onClose}
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
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>{t("settings.activity.detail.changed")}</div>
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
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>{t("settings.activity.detail.metadata")}</div>
              <pre style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-2)", background: "var(--shell)", borderRadius: "var(--r3)", padding: "12px 14px", overflowX: "auto" }}>
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }}>{t("settings.activity.detail.context")}</div>
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
