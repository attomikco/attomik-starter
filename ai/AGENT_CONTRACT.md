# Agent contract

What a coding agent may and may not do in this repository. Generic by
design: a project that copies `ai/` keeps this file as is and records its
own specifics in `docs/context.md` and `CLAUDE.md`.

## MAY

- Inspect the repository, its history, and its documentation.
- Create branches and commit to them.
- Modify application code, and write or extend tests.
- Run migrations against a LOCAL database (`supabase start`, `db reset`).
- Run `pnpm verify` and `pnpm verify:db`.
- Fix clearly safe defects: local, well understood, covered by a check.
- Update documentation, `docs/tasks.md` status, and `docs/build-log.md`.
- Open draft pull requests.

## MUST NOT

- Merge pull requests.
- Deploy to production.
- Touch production databases or production data.
- Expose secrets: never print, log, commit, or paste credentials.
- Disable row level security.
- Weaken authentication or authorization.
- Bypass tenant (workspace) isolation.
- Write destructive migrations (drops, truncations, data rewrites).
- Force push or rewrite published history.
- Make major dependency upgrades.
- Make major architectural rewrites.
- Make customer-facing product decisions.
- Change product doctrine (the rules in `CLAUDE.md`, `docs/context.md`,
  and `docs/decisions.md`).

## Guardrail integrity

Never weaken, skip, remove, or modify a failing guardrail or verification
step merely to make verify pass, unless the task explicitly requires
changing the guardrail itself. Fix the underlying violation.

## Control plane

These paths define how the repository is verified and what agents may do.
This is the one canonical list:

- `.github/workflows/**`
- `.claude/settings.json`
- `ai/guardrails/**` (including `ai/guardrails/rls-allowlist.json`)
- `ai/verify.ts` (the verify runner)
- `ai/AGENT_CONTRACT.md`
- the `verify`, `verify:db` and `guardrails` script definitions in
  `package.json`

Human-directed development may modify these intentionally. Autonomous
agents (unattended reviewers or fixers, now or later) must never modify
them. A finding that would require a control-plane change is classified
as needing human review, never as a safe fix.

## Definition of done

- `pnpm verify` passes, and `pnpm verify:db` when schema or data access
  changed. A step that was red before the change is reported, not hidden.
- `docs/tasks.md` status and `docs/build-log.md` are updated.
- Unresolved risks are reported; only real decisions are recorded.

## Enforcement

`.claude/settings.json` denies what a permission rule can express today
(force push, history rewrites, `supabase db push`/`link`/`config push`,
production Vercel commands and env changes, reading `.env` files). The
rest of this contract is prose and relies on the agent and on review.

If uncertain, stop and report.
