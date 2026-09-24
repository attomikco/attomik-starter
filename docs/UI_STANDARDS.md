# UI standards

Mandatory reading for any UI change. Short and concrete; the primitives that
make each rule the easy path live in `src/ui` and are named beside the rule.
`pnpm ui:audit` checks the measurable parts (docs/UI_AUDIT.md); the rest is
review. A project records its own exceptions here, never in a component.

## Page

- Every screen renders inside the shell's page container: `PageContainer`
  (`src/ui/layout/page.tsx`), which is the one scroll region of the screen.
  No page-level max-width or centred wrapper. Content fills the width from
  1440px to 2560px.
- Component-level caps on single-column forms are allowed and deliberate:
  a settings or profile field capped around 520–640px reads as a form, not
  a page. The cap goes on the field or card, never on the page.
- Record screens use `RecordLayout`; list screens use `PageContainer` +
  `PageHeader`. The signed-out group is a centred card by design.

## Header

- `PageHeader`: eyebrow (breadcrumb-style "Área · pantalla"), title, one-line
  subtitle or summary, actions on the right. One primary action per page at
  most; the rest secondary.
- A title may be a control (a month picker) through the same slot.

## CTA hierarchy

- One primary (filled) button per view. Everything else is secondary
  (outline) or a text link.
- Verbs describe what the button does in the app, never an action that
  happens outside it.
- Row actions that only remove use `IconButton`; row actions that navigate
  are secondary buttons or links.

## Colour semantics

Brand and status are separate systems.

- **Accent** is for primary actions, focus, selection and brand elements
  (the active tab count, the selected chip, a "today" marker).
- **Status** uses the fixed semantic hues: green for done, paid, active;
  amber for needs-attention; red for failure. Chips keep semantic green.
- **Routine states are neutral**: issued, open, pending-by-design, a role.
  Neutral is the default for anything that is not an outcome.
- **Needs-attention is amber, on the value only** — the amount, the chip or
  the days — never a filled card or a coloured section.
- **Red is for failures only**: errors, expired, not-done, destructive
  confirmations. A fallen metric is neutral (CLAUDE.md, Branding rules).
  A project that needs an exception records it in its own copy of this file.

## Tables

- `DataTable` is the table. Header and body read the same column widths
  from one source and get the trailing spacer under the same condition.
- Every column declares a minimum, explicitly or through `kind`; the table
  scrolls sideways inside its own container when they do not fit.
- Text cells get `minWidth: 0` and truncate with an ellipsis plus a `title`
  carrying the full text.
- Numbers are right-aligned in mono.
- The page body never scrolls sideways.
- Long tables keep a sticky header and a sticky first column.

## Forms

- Fields sit in `FormGrid` (a responsive auto-fit grid). A field whose
  content can grow — a chip list, a textarea, a list of rows — gets its own
  full-width row through `FormGrid.Full`.
- Conditional fields do not render until their dependencies are set.
- Errors show only when the user can act on them: format errors as they
  type, "at least one" rules after a save attempt.
- Segmented controls only when every option fits on one line at the
  narrowest width the field renders; otherwise use a select. `ChipSelect`
  enforces this: it measures, and falls back to a `Listbox` when an option
  would wrap.
- Lists that can exceed about 12 items use chips, search or a picker, never
  a long checkbox column.

## Copy

- All counts go through one pluralize helper: `pluralize(n, { one, other })`
  / `countOf` in `src/core/i18n` (Intl.PluralRules), which takes dictionary
  values or literal strings. Never "1 members".
- No raw markdown in rendered text (no `**`, no `#` headings).
- Explanatory copy is one line at most. If it needs more, it is a doc.

## Data regions

- Every data region has the four states: loading, ready, empty, error
  (`src/ui/data/data-states.tsx`). An empty region says what would fill it.

## Sizes

- Widths come from the grid, not from pixels. A fixed pixel width is
  acceptable only for a control (a listbox minimum, an icon button) or a
  table column, never for content.
- Radii are the three workspace tokens (`--r`, `--r2`, `--r3`), never a
  literal.
