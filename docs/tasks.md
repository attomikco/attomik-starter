# Tasks

> **Rule.** Agents may update the status of an item and add new items to
> IDEAS. Only the human moves items between sections or reorders them.

## NOW

_Nothing in progress._

## NEXT

### Module-provided Activity summaries
_From docs/ROADMAP.md (2026-09-01). Not implemented; needs its own spec._

**Problem.** `summarizeEvent` / `eventVerb` / `eventTone` in
`src/core/audit/summaries.ts` know only the core event names. A module
recording its own events via `recordActivity()` gets raw fallbacks in the
Activity screen unless it edits that core file — which the module contract
forbids.
**Why in the starter.** The audit foundation invites module events, so the
render side needs the matching extension point; otherwise every project's
first custom event forces a core edit.
**Likely boundary.** A summarizer registration keyed by action-name prefix
(the module id), declared as plain data/functions alongside the module's
definition and consumed by the Activity screen through the existing
registry — never a second audit table or a module-owned Activity UI.

### Bootstrap skin / project identity
_From docs/ROADMAP.md (2026-09-01). Status: TODO confirm — `projectConfig.skin`
now names a bootstrap preset; whether that closes the finding is undecided._

**Problem.** A fresh workspace renders the neutral default skin until
someone configures Settings → Appearance, so a client project's first
login shows the wrong identity.
**Likely boundary.** An optional initial-identity block in
`src/config/project.ts` (SkinInput values + logo assets — the persisted
shapes from `src/core/branding/persistence.ts`, never resolved CSS)
consumed once by the workspace bootstrap in `src/core/workspace`.
Appearance remains the runtime source of truth afterwards.

### Shell localization: registry navigation labels
_From docs/ROADMAP.md item 1 (implemented as `src/core/i18n`). Recorded
remaining gap: navigation labels still edited per project in module
definitions. Status: TODO confirm — CLAUDE.md now says names live under
`nav.modules` in the dictionary, which may already close it._

## BLOCKED

### `pnpm verify` is red: lint (3 `react/jsx-no-literals` errors left)
_Found 2026-09-27 (Phase 1); 23 of 26 resolved on the Phase 1 branch —
19 symbols/key legends now render from `src/ui/glyphs.ts`, 4 placeholder
strings moved to `customers`/`media` copy. Needs a product decision._
The Appearance live preview (`brand-editor.tsx`, `PreviewPanel`) shows
sample figures `$248,310`, `↑ 18.4%`, `vs $209,720`. "vs" is copy, and
the numbers should go through `useFormat()` — but which currency (none is
stored per workspace; es-MX would show `USD 248,310` for USD) and whether
the preview should show money at all is a product call.

### `pnpm verify:db` is red: `supabase/tests/table_grants.sql` self-check
_Found 2026-09-27 (Phase 1). Recommendation ready; needs human approval._
The Supabase CLI (2.118.0) leaves `api.auto_expose_new_tables` unset =
`true` on a local stack, so new `public` tables are auto-granted and the
self-check "a table without grants is detected" cannot fail. Recommended
fix: add `[api] auto_expose_new_tables = false` to `supabase/config.toml`.
Evidence (2026-09-27):
- It only changes how the LOCAL database is bootstrapped (`db start`,
  `db reset`, the `db diff` shadow). `supabase config push` does not send
  it: at v2.118.0 the push encoder for `[api]` carries only `db_schema`,
  `extra_search_path` and `max_rows`. Hosted projects are switched by
  Supabase itself (default for new projects since 2026-05-30, all
  projects on 2026-10-30; existing grants are kept). The CLI marks `true`
  deprecated for removal on 2026-10-30.
- On a fresh stack with `false`: `pnpm test:db`, the RLS guardrail, and
  `pnpm e2e` (mobile overflow + ui:audit, real sign-in and RPCs) all pass.
  Every table gets its grants from `private.expose_table()`, every public
  RPC has explicit grants, and no code relies on auto-exposure.
- It makes the local stack match what docs/SUPABASE.md and CLAUDE.md
  already claim ("a fresh Supabase project grants nothing on new tables").

## IDEAS

- Custom React Email auth templates (recorded as "a later concern" in
  CLAUDE.md auth rules until 2026-09-27).
- `supabase/tests/table_grants.sql` check 2 fails on ANY public table
  without RLS; if `ai/guardrails/rls-allowlist.json` ever gains an entry,
  that test needs the same allowlist or the two will disagree.
- `auto_expose_new_tables = false` revokes only DML on tables and
  select/usage on sequences: new tables still default-grant TRUNCATE,
  REFERENCES, TRIGGER and MAINTAIN (and sequences UPDATE) to anon and
  authenticated. Not reachable through the Data API; consider a hardening
  migration that revokes them.
- `private.expose_table()` grants no sequence usage; a table with an
  identity/serial column that clients insert into would need it.
- docs/SUPABASE.md states the table-grant rule but not the function rule
  (every public function revokes EXECUTE from PUBLIC and grants
  explicitly), which all current migrations already follow.
