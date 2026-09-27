# Build log

Meaningful work only — not every commit. Newest last. Entry format:

```
## YYYY-MM-DD — change
- Systems touched:
- Validation: every check that ran, with its result ("visual: not verified" when true)
- Outcome:
- Open questions:
```

## 2026-09-27 — Phase 1: agent harness foundation
- Systems touched: `ai/` (verify runner, guardrails, contract, context
  template), `eslint.config.mjs` (admin-client boundary), `package.json`
  scripts (`verify`, `verify:db`, `guardrails`, `test` glob),
  `.github/workflows/verify.yml`, `.claude/settings.json`, `docs/`
  (context, tasks, build-log, decisions; ROADMAP moved to tasks),
  `CLAUDE.md` (operating sequence). No app code changed.
- Validation: `pnpm verify` — typecheck pass, lint FAIL (26 pre-existing
  `react/jsx-no-literals` errors), test pass, build pass, guardrails pass.
  `pnpm verify:db` (local stack, Supabase CLI 2.118.0) — start pass,
  reset pass, test:db FAIL (pre-existing table_grants self-check), rls
  guardrail pass. Each guardrail was shown to fail on a planted violation
  and pass once it was removed. actionlint on the workflow: pass. The CI
  workflow itself has not run yet. Visual: not verified (no UI change).
- Outcome: the harness exists and reports every failing step in one run;
  verify and verify:db are red on pre-existing issues, recorded in
  docs/tasks.md BLOCKED.
- Open questions: the two BLOCKED items; whether ROADMAP items 1 and 3
  are already closed by `nav.modules` and `projectConfig.skin`.

## 2026-09-27 — i18n lint: 26 existing violations classified
- Systems touched: `src/ui/glyphs.ts` (new), 15 components under
  `src/ui` and `src/modules/settings`, `src/modules/{customers,media}`
  (copy.ts + index.tsx), `src/core/i18n/translator.test.ts`, docs/I18N.md.
- Validation: `pnpm typecheck` pass; `pnpm lint` 3 errors (the preview
  figures, left on purpose); `pnpm test` pass (149); `pnpm ui:audit`
  pass — 14 routes × 390/1440/2560 × light/dark, contact sheet
  `e2e/screenshots/contact-sheet.html`. Visual: glyphs checked in
  screenshots; the Customers/Media placeholders are disabled modules
  (404 in the audit), so their new copy is not visually verified.
- Outcome: 4 user-facing strings → dictionaries (en + es-MX), 19
  symbols/key legends → one reviewed list; 3 need product judgment.
- Open questions: the Appearance preview's sample figures (docs/tasks.md).

## 2026-09-27 — `auto_expose_new_tables` investigated (not changed)
- Systems touched: docs/tasks.md only (the setting is NOT committed).
- Validation: Supabase CLI v2.118.0 source read (config push encoder,
  local bootstrap); on a fresh local stack with the setting `false`
  (reverted afterwards): `pnpm test:db` pass, RLS guardrail pass,
  `pnpm e2e` pass (mobile-overflow, ui-audit). Visual: covered by ui-audit.
- Outcome: `false` is recommended as the starter default — local-only,
  not sent by `config push`, nothing depends on auto-exposure. Awaiting
  human approval.
- Open questions: residual TRUNCATE/REFERENCES/TRIGGER/MAINTAIN default
  grants (docs/tasks.md IDEAS).
