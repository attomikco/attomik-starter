# Decisions

Format: `## YYYY-MM-DD — title`, then Decision, Why, and Consequences in a
few lines each; newest last; entries are never rewritten, only superseded.

## 2026-09-27 — ai/ holds the harness, docs/ holds project state

**Decision.** `ai/` contains starter-owned agent-harness files that any
repository cloned from the starter can copy unchanged (contract, verify
runner, guardrails, templates). `docs/` contains project-owned state
(`context.md`, `tasks.md`, `build-log.md`, this file, system docs).
**Why.** Harness upgrades must merge cleanly into clones; project facts
must never be overwritten by a harness update.
**Consequences.** Nothing project-specific goes in `ai/`; a clone fills
`docs/context.md` from `ai/templates/context.md`.

## 2026-09-27 — `pnpm verify` defines repo health

**Decision.** The repository is healthy when `pnpm verify` (typecheck,
lint, test, build, guardrails) exits 0, and `pnpm verify:db` (local
Supabase: reset, SQL tests, RLS guardrail) exits 0 when schema or data
access changed. CI runs both on every pull request and on push to main.
**Why.** One command that humans, CI, and agents all run means "done" has
a single meaning; the runner reports every failing step at once.
**Consequences.** A new check is added to verify rather than to ad hoc
scripts. Verify was red on introduction (lint, test:db); see docs/tasks.md.

## 2026-09-27 — The control plane is human-owned

**Decision.** The paths listed under "Control plane" in
`ai/AGENT_CONTRACT.md` (workflows, `.claude/settings.json`, guardrails and
their allowlist, the verify runner, the contract, and the verify/guardrail
script definitions) may be changed only by human-directed work. Autonomous
agents never modify them; a finding that needs such a change goes to human
review.
**Why.** An agent that can edit its own checks can make any change pass.
**Consequences.** Phase 1 defines the boundary only; enforcement for
autonomous jobs arrives with those jobs.

## 2026-09-27 — Local stack never auto-exposes new tables

**Decision.** `supabase/config.toml` sets `[api] auto_expose_new_tables =
false`: new `public` objects get no Data API grants unless a migration
grants them (`private.expose_table()`, explicit function grants).
**Why.** It matches hosted Supabase (default for new projects since
2026-05-30, all projects from 2026-10-30), the model docs/SUPABASE.md
already describes, and it is the only way `table_grants.sql` can detect a
missing grant. The key is local-only; `supabase config push` does not send
it, so deployed projects are unaffected.
**Consequences.** A migration that forgets its grants fails locally and in
CI instead of in production. New tables still default-grant TRUNCATE,
REFERENCES, TRIGGER and MAINTAIN (docs/tasks.md IDEAS).
