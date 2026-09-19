"use client"

import { useMemo, useState, type CSSProperties, type ReactNode } from "react"
import type { FeedbackResolutionRow, FeedbackRow } from "@/core/feedback"
import type { ResolveFeedbackResult } from "@/core/feedback/actions"
import { useCopy, useFormat, useT } from "@/core/i18n/client"
import { clampPage, pageCount, pageSlice, pageSummary } from "@/core/data/query"
import type { Role } from "@/core/permissions"
import { DataTable, ToneChip } from "@/ui/data/data-table"
import { TabStrip } from "@/ui/data/tab-strip"
import { DetailDrawer } from "@/ui/records/detail-drawer"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"
import { ResolveDialog } from "./resolve-dialog"

const PAGE_SIZE = 25

export interface FeedbackMember {
  userId: string
  email: string
  displayName: string | null
  role: Role
}

type Status = "pending" | "resolved"

/**
 * Table cells never render long text: free-form comments and resolution
 * notes clamp to two lines with an ellipsis, identifiers (user, route) to
 * one. The full text lives in the detail drawer, where it wraps normally.
 */
const CLAMP: CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  maxWidth: "40ch", minWidth: 0, overflowWrap: "anywhere",
}
const ONE_LINE: CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }

/**
 * Settings → Feedback: newest-first listing of every row filed through the
 * floating capture widget (src/core/feedback), split into Pending (default)
 * and Resolved. "Resolved" is derived from a feedback_resolutions row
 * existing; the feedback rows themselves are never edited. Pending rows
 * carry the "Mark as resolved" action; resolved rows show the badge,
 * resolver, date, and note. Owner/admin only — the page 404s otherwise, so
 * the action never renders for anyone else, and the server action and RLS
 * re-check it regardless.
 */
export function FeedbackScreen({ rows, resolutions, members }: { rows: FeedbackRow[]; resolutions: FeedbackResolutionRow[]; members: FeedbackMember[] }) {
  const copy = useCopy()
  const t = useT(settingsCopy)
  const fmt = useFormat()
  const { say } = useToast()
  const [status, setStatus] = useState<Status>("pending")
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState<FeedbackRow | null>(null)
  const [detail, setDetail] = useState<FeedbackRow | null>(null)

  const byUser = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members])
  const resolutionOf = useMemo(() => new Map(resolutions.map((r) => [r.feedbackId, r])), [resolutions])

  const { pending, resolved } = useMemo(() => {
    const pending = rows.filter((r) => !resolutionOf.has(r.id))
    const resolved = rows
      .filter((r) => resolutionOf.has(r.id))
      .sort((a, b) => resolutionOf.get(b.id)!.createdAt.localeCompare(resolutionOf.get(a.id)!.createdAt))
    return { pending, resolved }
  }, [rows, resolutionOf])

  const list = status === "pending" ? pending : resolved
  const pageState = { page: clampPage(page, { total: list.length, pageSize: PAGE_SIZE }), pageSize: PAGE_SIZE, total: list.length }
  const visible = pageSlice(list, pageState)

  const tabs = [
    { label: t("settings.feedback.tab.pending"), count: pending.length },
    { label: t("settings.feedback.tab.resolved"), count: resolved.length },
  ]
  const pick = (label: string) => {
    setStatus(label === t("settings.feedback.tab.resolved") ? "resolved" : "pending")
    setPage(1)
  }

  const resolverName = (r: FeedbackResolutionRow) => {
    const person = r.resolvedBy ? byUser.get(r.resolvedBy) : undefined
    return person ? person.displayName?.trim() || person.email : copy.audit.formerMember
  }

  const memberName = (userId: string) => {
    const person = byUser.get(userId)
    return person ? person.displayName?.trim() || person.email : copy.audit.formerMember
  }

  const done = (result: ResolveFeedbackResult) => {
    setResolving(null)
    if (result.email === "failed") say(t("settings.feedback.toast.emailFailed"))
    else if (result.email === "sent") say(t.n("settings.feedback.toast.resolvedSent", result.recipientCount ?? 0))
    else say(t("settings.feedback.toast.resolved"))
  }

  const columns = [
    { key: "when", label: t("settings.feedback.column.when"), width: 150, mono: true, text: (r: FeedbackRow) => fmt.dateTime(r.createdAt) },
    { key: "user", label: t("settings.feedback.column.user"), width: 200, render: (r: FeedbackRow) => <span style={ONE_LINE}>{byUser.get(r.userId)?.email ?? copy.audit.formerMember}</span> },
    { key: "type", label: t("settings.feedback.column.type"), width: 140, text: (r: FeedbackRow) => copy.feedback.types[r.type] },
    { key: "route", label: t("settings.feedback.column.route"), width: 180, mono: true, render: (r: FeedbackRow) => <span style={ONE_LINE}>{r.route}</span> },
    {
      key: "message", label: t("settings.feedback.column.message"), flex: true,
      render: (r: FeedbackRow) => (
        <span style={{ ...CLAMP, fontSize: 13.5, color: "var(--txt)" }}>{r.message}</span>
      ),
    },
    status === "pending"
      ? {
          key: "actions", label: t("settings.feedback.column.actions"), width: 170,
          render: (r: FeedbackRow) => (
            <button className="ui-btn sh-pick" onClick={(e) => { e.stopPropagation(); setResolving(r) }}
              style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "7px 14px", whiteSpace: "nowrap" }}>
              {t("settings.feedback.action.resolve")}
            </button>
          ),
        }
      : {
          key: "resolution", label: t("settings.feedback.column.resolution"), width: 280,
          render: (r: FeedbackRow) => {
            const res = resolutionOf.get(r.id)
            if (!res) return null
            return (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 0, maxWidth: "100%" }}>
                <ToneChip tone="ok" label={t("settings.feedback.badge.resolved")} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)", overflowWrap: "anywhere" }}>
                  {t("settings.feedback.resolution.by", { name: resolverName(res), date: fmt.dateTime(res.createdAt) })}
                </span>
                {res.note && (
                  <span style={{ ...CLAMP, fontSize: 13, color: "var(--txt-2)", lineHeight: 1.45 }}>{res.note}</span>
                )}
              </span>
            )
          },
        },
  ]

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: "none" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>{t("settings.feedback.eyebrow")}</div>
        <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.feedback.title")}</h1>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-3)" }}>{t("settings.feedback.intro")}</div>
      </div>

      <div style={{ flex: "none" }}>
        <TabStrip tabs={tabs} active={t(`settings.feedback.tab.${status}`)} onPick={pick} />
      </div>

      <DataTable<FeedbackRow>
        columns={columns}
        rows={visible}
        rowKey={(r) => r.id}
        onRowClick={setDetail}
        layout="auto"
        state="ready"
        empty={rows.length === 0
          ? { title: t("settings.feedback.empty.title"), body: t("settings.feedback.empty.body") }
          : { title: t(`settings.feedback.empty.${status}.title`), body: t(`settings.feedback.empty.${status}.body`) }}
        footerText={pageSummary(pageState, visible.length, copy.data, fmt.number)}
        pagination={{ page: pageState.page, pageCount: pageCount(pageState), onPage: setPage }}
      />

      {detail && (
        <FeedbackDrawer
          row={detail}
          resolution={resolutionOf.get(detail.id)}
          submitter={byUser.get(detail.userId)?.email ?? copy.audit.formerMember}
          resolver={resolverName}
          memberName={memberName}
          onClose={() => setDetail(null)}
        />
      )}

      {resolving && <ResolveDialog row={resolving} members={members} onClose={() => setResolving(null)} onResolved={done} />}
    </div>
  )
}

const LABEL: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 10 }
const LONG_TEXT: CSSProperties = { fontSize: 14, color: "var(--txt)", lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 }

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map(([label, value], i) => (
        <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "8px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : undefined }}>
          <span style={{ fontSize: 13, color: "var(--txt-2)", flex: "none", width: 110 }}>{label}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt)", flex: 1, minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Full record of one feedback row: the whole comment, who sent it, when,
 * from which route and of which type, and, once resolved, the whole
 * resolution with resolver, date and the members notified by email.
 */
function FeedbackDrawer({
  row, resolution, submitter, resolver, memberName, onClose,
}: {
  row: FeedbackRow
  resolution: FeedbackResolutionRow | undefined
  submitter: string
  resolver: (r: FeedbackResolutionRow) => string
  memberName: (userId: string) => string
  onClose: () => void
}) {
  const copy = useCopy()
  const t = useT(settingsCopy)
  const fmt = useFormat()

  return (
    <DetailDrawer
      ariaLabel={t("settings.feedback.detail.title")}
      closeLabel={t("settings.feedback.detail.close")}
      eyebrow={fmt.dateTime(row.createdAt)}
      title={copy.feedback.types[row.type]}
      chips={<ToneChip tone={resolution ? "ok" : "warn"} label={resolution ? t("settings.feedback.badge.resolved") : t("settings.feedback.badge.pending")} />}
      onClose={onClose}
    >
      <div>
        <div style={LABEL}>{t("settings.feedback.column.message")}</div>
        <p style={LONG_TEXT}>{row.message}</p>
      </div>

      <div>
        <div style={LABEL}>{t("settings.feedback.detail.context")}</div>
        <Facts rows={[
          [t("settings.feedback.column.user"), submitter],
          [t("settings.feedback.column.when"), fmt.dateTime(row.createdAt)],
          [t("settings.feedback.column.type"), copy.feedback.types[row.type]],
          [t("settings.feedback.column.route"), row.route],
        ]} />
      </div>

      {resolution && (
        <div>
          <div style={LABEL}>{t("settings.feedback.column.resolution")}</div>
          {resolution.note
            ? <p style={LONG_TEXT}>{resolution.note}</p>
            : <p style={{ ...LONG_TEXT, color: "var(--txt-3)" }}>{t("settings.feedback.detail.noNote")}</p>}
          <div style={{ marginTop: 14 }}>
            <Facts rows={[
              [t("settings.feedback.detail.resolvedBy"), resolver(resolution)],
              [t("settings.feedback.detail.resolvedAt"), fmt.dateTime(resolution.createdAt)],
              [t("settings.feedback.detail.notified"), resolution.notifiedUserIds.length ? resolution.notifiedUserIds.map(memberName).join(", ") : t("settings.feedback.detail.notifiedNone")],
            ]} />
          </div>
        </div>
      )}
    </DetailDrawer>
  )
}
