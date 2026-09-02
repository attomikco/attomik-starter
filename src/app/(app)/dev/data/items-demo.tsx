"use client"

import { useCopy, useFormat } from "@/core/i18n/client"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  applyFilters, applySearch, applySort, clampPage, pageCount, pageSlice, pageSummary, toggleSort,
} from "@/core/data/query"
import type { DataState, FilterCondition, FilterFieldDef, SavedView, SortState } from "@/core/data/types"
import { BulkBar } from "@/ui/data/bulk-bar"
import { DataTable, PersonCell, ToneChip } from "@/ui/data/data-table"
import { FilterBuilder } from "@/ui/data/filter-builder"
import { ColumnPicker, ControlButton, SearchInput, StatusTabs } from "@/ui/data/table-controls"
import { SavedViewsBar, useSavedViews } from "@/ui/data/saved-views"
import { ConfirmDialog, type ConfirmOptions } from "@/ui/records/confirm-dialog"
import { useToast } from "@/ui/shell/toast-provider"

/**
 * DEVELOPMENT DEMO — neutral "Items" entity proving the canonical data
 * primitives. Not navigation-registered, no database schema; the state
 * switcher below fakes loading/empty/error exactly like the reference.
 */

interface Item {
  id: string
  name: string
  status: "Active" | "Pending" | "Failed" | "Archived"
  owner: string
  amount: number
  createdAt: string
}

const DEMO_ITEMS: Item[] = [
  ["IT-1012", "Northwind sync", "Active", "Sam Whitfield", 486, "2026-08-28"],
  ["IT-1011", "Quarterly rollup", "Pending", "Anna Hayes", 72, "2026-08-28"],
  ["IT-1010", "Asset sweep", "Active", "Priya Nair", 318.5, "2026-08-27"],
  ["IT-1009", "Ledger import", "Archived", "Tomás Ferreira", 2140, "2026-08-27"],
  ["IT-1008", "Webhook relay", "Failed", "Hanna Køhler", 96, "2026-08-26"],
  ["IT-1007", "Nightly digest", "Active", "Owen Reyes", 154, "2026-08-26"],
  ["IT-1006", "Backfill run", "Archived", "Sara Lindqvist", 68, "2026-08-25"],
  ["IT-1005", "Vendor feed", "Active", "Diego Ortiz", 1584, "2026-08-25"],
  ["IT-1004", "Media scan", "Active", "Naomi Chen", 232, "2026-08-24"],
  ["IT-1003", "Export batch", "Pending", "Idris Okafor", 1056, "2026-08-24"],
  ["IT-1002", "Catalog check", "Active", "Lena Fischer", 118, "2026-08-23"],
  ["IT-1001", "Intake queue", "Failed", "Ravi Menon", 274.5, "2026-08-23"],
].map(([id, name, status, owner, amount, createdAt]) => ({ id, name, status, owner, amount, createdAt }) as Item)

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: "status", label: "Status", options: ["Active", "Pending", "Failed", "Archived"] },
  { key: "owner", label: "Owner" },
  { key: "amount", label: "Amount", kind: "number" },
]

const money = (fmt: { number: (n: number, o?: Intl.NumberFormatOptions) => string }, v: number) => "$" + fmt.number(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const STATUS_TONE: Record<Item["status"], "ok" | "warn" | "bad" | "neutral"> = {
  Active: "ok", Pending: "warn", Failed: "bad", Archived: "neutral",
}

const PAGE_SIZE = 8

export function ItemsDemo() {
  const copy = useCopy()
  const fmt = useFormat()
  const { say } = useToast()
  const [demoState, setDemoState] = useState<DataState>("ready")
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState("All")
  const [sort, setSort] = useState<SortState | null>({ key: "createdAt", dir: "desc" })
  const [conditions, setConditions] = useState<FilterCondition[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [hidden, setHidden] = useState<string[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const { views, saveView, removeView } = useSavedViews("dev-items-views")

  const valueOf = (r: Item, k: string) => r[k as keyof Item]

  const processed = useMemo(() => {
    let rows = DEMO_ITEMS
    rows = applySearch(rows, query, (r) => `${r.id} ${r.name} ${r.owner}`)
    if (tab !== "All") rows = rows.filter((r) => r.status === tab)
    rows = applyFilters(rows, conditions, valueOf)
    rows = applySort(rows, sort, valueOf)
    return rows
  }, [query, tab, conditions, sort])

  const pageState = { page: clampPage(page, { total: processed.length, pageSize: PAGE_SIZE }), pageSize: PAGE_SIZE, total: processed.length }
  const visibleRows = pageSlice(processed, pageState)
  const selectedIds = Object.keys(selected).filter((k) => selected[k])

  const tabs = ["All", "Active", "Pending", "Failed"].map((label) => ({
    label,
    count: label === "All" ? DEMO_ITEMS.length : DEMO_ITEMS.filter((r) => r.status === label).length,
  }))

  const columns = [
    { key: "id", label: "Item", pinned: true, sortable: true, width: 96, mono: true, text: (r: Item) => r.id },
    { key: "name", label: "Name", pinned: true, sortable: true, flex: true, render: (r: Item) => <PersonCell name={r.name} sub={r.owner} /> },
    { key: "status", label: "Status", sortable: true, width: 130, render: (r: Item) => <ToneChip tone={STATUS_TONE[r.status]} label={r.status} /> },
    { key: "amount", label: "Amount", sortable: true, width: 104, align: "right" as const, mono: true, text: (r: Item) => money(fmt, r.amount) },
    { key: "createdAt", label: "Created", sortable: true, width: 108, align: "right" as const, mono: true, text: (r: Item) => r.createdAt },
  ]

  const applyView = (view: SavedView | null) => {
    setActiveViewId(view?.id ?? null)
    setConditions(view?.filters ?? [])
    setSort(view?.sort ?? { key: "createdAt", dir: "desc" })
    setHidden(view?.hiddenColumns ?? [])
    setTab(view?.tab ?? "All")
    setPage(1)
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", flex: "none" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }}>Development · demo data</div>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 0" }}>Items</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)" }}>Data state</span>
          {(["ready", "loading", "empty", "error"] as DataState[]).map((s) => (
            <button key={s} className="ui-btn" onClick={() => setDemoState(s)}
              style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 999,
                ...(demoState === s ? { background: "var(--accent)", color: "var(--accent-ink)" } : { background: "var(--card)", color: "var(--txt-3)", border: "1px solid var(--line)" }) }}>
              {s}
            </button>
          ))}
          <Link href="/dev/data/record" style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "8px 14px", textDecoration: "none" }}>
            Record & form demo →
          </Link>
        </div>
      </div>

      <SavedViewsBar
        views={views}
        activeId={activeViewId}
        onPick={applyView}
        onRemove={(id) => { removeView(id); applyView(null) }}
        onSaveCurrent={() => {
          const label = window.prompt("Name this view")?.trim()
          if (!label) return
          const view: SavedView = { id: crypto.randomUUID(), label, filters: conditions, sort, hiddenColumns: hidden, tab }
          saveView(view)
          setActiveViewId(view.id)
          say("View saved")
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "none" }}>
        <StatusTabs tabs={tabs} active={tab} onPick={(t) => { setTab(t); setPage(1) }} />
        <div style={{ flex: 1 }} />
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search items, owners" />
        <ControlButton
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M3 5h18M6 12h12M10 19h4" /></svg>}
          label="Filters"
          on={filterOpen || conditions.length > 0}
          badge={conditions.length ? String(conditions.length) : undefined}
          onClick={() => setFilterOpen((o) => !o)}
        />
        <ColumnPicker columns={columns} hidden={hidden}
          onToggle={(key) => setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : h.concat(key)))}
          onReset={() => setHidden([])} />
      </div>

      {filterOpen && (
        <FilterBuilder fields={FILTER_FIELDS} conditions={conditions}
          onChange={(c) => { setConditions(c); setPage(1) }}
          onClear={() => { setConditions([]); setQuery(""); setTab("All"); setPage(1) }} />
      )}

      <DataTable<Item>
        columns={columns}
        rows={visibleRows}
        rowKey={(r) => r.id}
        sort={sort}
        onSort={(key) => setSort((s) => toggleSort(s, key))}
        hiddenColumns={hidden}
        selected={selected}
        onToggleRow={(key) => setSelected((s) => ({ ...s, [key]: !s[key] }))}
        onToggleAll={() => {
          const allOn = processed.length > 0 && processed.every((r) => selected[r.id])
          setSelected(allOn ? {} : Object.fromEntries(processed.map((r) => [r.id, true])))
        }}
        onRowClick={(r) => say(`${r.id} peeked — full record demo at /dev/data/record`)}
        state={demoState}
        empty={{
          title: "Nothing matches those filters",
          body: "The conditions are narrowing 12 items down to none. Clearing them usually brings results back.",
          action: { label: "Clear filters", onRun: () => { setConditions([]); setQuery(""); setTab("All"); setDemoState("ready") } },
        }}
        error={{
          title: "Could not load items",
          body: "The demo source returned a 503. Nothing was fetched; retry when the connection recovers.",
          onRetry: () => { setDemoState("loading"); window.setTimeout(() => { setDemoState("ready"); say("Items reloaded") }, 1200) },
          traceId: "8f2c-4471-be0a",
        }}
        footerText={selectedIds.length ? `${selectedIds.length} selected · ${pageSummary(pageState, visibleRows.length, copy.data, fmt.number)}` : pageSummary(pageState, visibleRows.length, copy.data, fmt.number)}
        pagination={{ page: pageState.page, pageCount: pageCount(pageState), onPage: setPage }}
      />

      <BulkBar
        count={selectedIds.length}
        noun="item"
        onClear={() => setSelected({})}
        actions={[
          { label: "Activate", onRun: () => { setSelected({}); say(`${selectedIds.length} activated`) } },
          { label: "Export", onRun: () => { setSelected({}); say(`Exporting ${selectedIds.length} items`) } },
          {
            label: "Archive",
            onRun: () => setConfirm({
              tone: "accent", title: `Archive ${selectedIds.length} items?`,
              body: "Archived items leave the default views but stay in reporting and can be restored at any time.",
              confirmLabel: "Archive them",
              onConfirm: () => { setSelected({}); say(`${selectedIds.length} archived`) },
            }),
          },
          {
            label: "Delete", tone: "bad",
            onRun: () => setConfirm({
              tone: "bad", typedWord: "DELETE", title: `Delete ${selectedIds.length} items?`,
              body: "Deleting removes the items and their history from reporting. There is no undo.",
              confirmLabel: "Delete permanently", cancelLabel: "Keep them",
              onConfirm: () => { setSelected({}); say(`${selectedIds.length} items deleted`) },
            }),
          },
        ]}
      />

      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
