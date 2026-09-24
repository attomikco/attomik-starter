# Data / CRUD foundation

Reusable, domain-agnostic primitives ported from `part-data.dc.html` and
`part-records.dc.html`. UI components never know what a Customer or Order
is — modules supply rows, columns, filters, and actions.

## Layout

```
src/core/data/     pure logic: types + query helpers (node-tested)
src/ui/data/       DataTable, controls, filter builder, saved views,
                   bulk bar, pagination, the four data states
src/ui/forms/      Field, TextInput, TextArea, SelectInput, Toggle,
                   Checkbox, RadioCards, FormErrorBanner, SaveBar
src/ui/records/    RecordLayout, RecordSection, ActionButton, ConfirmDialog
```

Live demo (dev-only, not in navigation): `/dev/data` and `/dev/data/record`.

## DataTable

`DataTable<T>` is fully controlled: it renders the rows, sort indicators,
selection, states, footer, and pagination it is given — it never processes
data itself. That is what makes server-side sorting/filtering/paging a
drop-in later: today a module runs the `core/data` helpers client-side;
tomorrow it sends the same serializable `SortState` / `FilterCondition[]` /
`PageState` to an API and passes the response straight in. Never assume the
whole dataset fits in the client.

```tsx
const columns: ColumnDef<Item>[] = [
  { key: "id", label: "Item", pinned: true, sortable: true, width: 96, mono: true, text: r => r.id },
  { key: "name", label: "Name", flex: true, render: r => <PersonCell name={r.name} sub={r.owner} /> },
  { key: "status", label: "Status", width: 130, render: r => <ToneChip tone="ok" label={r.status} /> },
]

<DataTable columns={columns} rows={pageRows} rowKey={r => r.id}
  sort={sort} onSort={k => setSort(s => toggleSort(s, k))}
  selected={selected} onToggleRow={...} onToggleAll={...}
  state={state} empty={{ title, body, action }} error={{ title, onRetry, traceId }}
  footerText={pageSummary(pageState, pageRows.length)}
  pagination={{ page, pageCount: pageCount(pageState), onPage }} />
```

Columns: `pinned` (can't be hidden), `flex` (a flexible column: takes the
extra space), `width` (fixed, also its minimum), `minWidth`, `kind` (`text`
160 / `date` 120 / `status` 130 / `number` 100 / `code` 90 — the default
minimum when neither `width` nor `minWidth` is given), `align`, `mono`
(numerals/ids/timestamps), `render` or `text`.

Sizing (docs/UI_STANDARDS.md, Tables; `src/ui/data/table-layout.ts`, node-
tested): a column never shrinks below its minimum. The row's intrinsic width
is the sum of the VISIBLE columns' minimums plus gaps, padding, the select
checkbox and the row-action spacer, recomputed as the column picker hides or
shows columns. Once that no longer fits, the body scrolls sideways inside
the table's own frame and drives the header's scrollLeft, so the two never
drift and the page never scrolls sideways. The first column (the row
identifier) is sticky on the left; the header is sticky on top; a right-edge
shadow shows while columns sit off-screen. Plain `text` cells truncate with
an ellipsis and carry the full value as `title`; a `render` cell must do the
same itself (`PersonCell` does, per line). Header labels truncate with a
title too. Under 720px the rows wrap into the card representation instead.

## Query helpers (`core/data/query`)

`toggleSort` (new key → desc, again → flip) · `applySort` · `applySearch`
(modules declare the searchable text — rows are never blindly stringified) ·
`applyFilters` (match-all) with operators `equals / not_equals / contains /
is_empty / is_not_empty / gte / lte` · `pageCount / clampPage / pageSlice /
pageSummary` · `serializeView / deserializeView` · `isDirty`.

## Filters and saved views

`FilterBuilder` renders module-declared `FilterFieldDef`s into serializable
`FilterCondition[]`. `useSavedViews(storageKey)` + `SavedViewsBar` persist
`SavedView` (filters + sort + hidden columns + tab) to localStorage for now;
the shape is ready for server persistence when a module needs it.

## Selection and bulk actions

Table selection is controlled; `BulkBar` shows the floating inverted pill
with module-supplied `{ label, onRun, tone }` actions. Destructive actions
route through `ConfirmDialog` — consequence copy, optional `typedWord`
confirmation, focus handled. Never `confirm()`, never per-module dialogs.

## The four data states

`state: loading | ready | empty | error` — non-negotiable on every table.
Empty takes title/reason/action; error takes message/retry/trace id.
Never invent fake content when data is absent.

## RecordLayout and forms

`RecordLayout` gives the record header (eyebrow/title/status/subtitle/
actions), tabs, and main+aside split (collapses under ~960px of its own
panel). `RecordSection` is the standard shell-ground card. Form fields take
SPECIFIC validation messages from the caller ("Missing the @ — …", never
"Invalid value"); Zod or domain logic produces them. Standard CRUD forms
use `SaveBar` with explicit save and dirty state (`isDirty`) — Appearance's
autosave is the documented exception, not the pattern.

## Responsive

DataTable and RecordLayout measure their own container (the rail changes
available width), not the window. Under 720px the table drops its header
and wraps rows into the reference card representation.
