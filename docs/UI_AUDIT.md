# UI audit

`pnpm ui:audit` is the measurable half of docs/UI_STANDARDS.md. It runs the
Playwright audit spec (`e2e/ui-audit.spec.ts`) against the LOCAL Supabase
stack, exactly like `pnpm e2e` (docs/SUPABASE.md, "End-to-end tests"):

```bash
E2E_SUPABASE_URL=<API_URL> \
E2E_SUPABASE_PUBLISHABLE_KEY=<anon key> \
E2E_SUPABASE_SERVICE_ROLE_KEY=<service role key> \
pnpm ui:audit
```

For every page route (`src/app/**/page.tsx`, seeded params), at 390, 1440
and 2560px, light and dark, it takes a screenshot and fails on:

- horizontal overflow of the page body (`e2e/support/overflow.ts`);
- overlapping text: bounding boxes of visible text nodes that intersect
  (sticky and fixed overlays and `[data-allow-overlap]` excused);
- clipped text: an element clipping wider content without an ellipsis plus a
  `title`/`aria-label` (`[data-allow-overflow]` excused);
- at 1440px and wider, main content narrower than 90% of the screen host;
- a count of one followed by a plural (`1 members`, `1 miembros`) or raw
  markdown in visible text (`src/core/i18n/plural-nouns.ts` holds the noun
  list in both locales; a project adds its domain nouns);
- a segmented control (`[data-segmented]`, i.e. ChipSelect single mode)
  whose options wrap onto more than one line.

Output: `e2e/screenshots/contact-sheet.html` (all routes × widths ×
appearances on one page, with each cell's findings) and
`e2e/screenshots/audit-report.json`. `E2E_ROUTES=/cobranza,/flota` limits a
run; `E2E_WIDTHS=1440` limits the widths.

The static half runs in `pnpm test` (`src/ui/layout/static-rules.test.ts`):
no page-level centring or ≥1000px max-width in screen files (the signed-out
group's centred card excepted), and no raw plural built next to a count
outside `pluralize` — a project that inherits raw plurals lists them in
`KNOWN_RAW_PLURALS`, which only ever shrinks (empty in the starter).
