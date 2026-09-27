# Context — Attomik Starter

Durable facts about this repository. Code rules live in `CLAUDE.md`, agent
rules in `ai/AGENT_CONTRACT.md`, work in `docs/tasks.md`, history in
`docs/build-log.md`. Template: `ai/templates/context.md`.

## Product
The canonical Attomik foundation for multi-user product applications: one
codebase cloned per project, configured — never rewritten. Modules are
optional product functionality enabled per project through
`src/config/project.ts`. Commercial model per project: TODO.

## Users
Two audiences. Developers at Attomik clone the starter to begin a client
project (docs/NEW_PROJECT.md). End users of each project sign in by magic
link and belong to workspaces as owner, admin, member, or viewer
(docs/TEAM.md). Who the end users of a given project are: per project.

## Doctrine
The rules in `CLAUDE.md` (module enablement, production surface, workspace,
auth, audit, email, branding, shell, data) are the product doctrine; this
file does not restate them. Changing doctrine is a human decision.

## UX principles
`/design-reference` (read-only) is the visual and behavioral source of
truth. `docs/UI_STANDARDS.md` is mandatory before any UI change;
`pnpm ui:audit` checks every route at 390/1440/2560 in light and dark. Light
and dark are independent palettes; red is reserved for errors and
destructive actions; every user-facing string comes from `src/core/i18n`.

## Architecture
Next.js 16 (App Router, TypeScript 7, Turbopack) · Supabase (auth,
Postgres + RLS, storage) · Resend · Vercel. Map: `docs/ARCHITECTURE.md`.
- `src/core/` — infrastructure shared by every project; no business logic.
- `src/ui/` — canonical reusable visual components.
- `src/modules/` — optional product functionality, toggled via config.
- `src/app/` — routes; `/dev/*` are development-only review tools.
- `supabase/` — `config.toml` (auth as code), migrations, SQL tests.

## Critical systems
Auth (verified server-side identity), workspace isolation (RLS on every
table, roles from `workspace_members`), the append-only audit trail
(database triggers), email (one catalog in `src/core/email`), and
server-first workspace branding.

## Tenant model
The tenant is the workspace. All product data belongs to a workspace
unless explicitly global; RLS enforces membership on every table
(`private.member_workspace_ids()`); modules read workspace data only
through `src/core/workspace`. Docs: `docs/WORKSPACES.md`.

## Data sensitivity
Personal data held: email addresses, display names, avatars, locale, audit
events of who changed what, and free-text feedback. Retention and
regulatory requirements: TODO.

## AI usage
No AI features run in the product today (an `assistant` module flag exists
and ships disabled). Coding agents work under `ai/AGENT_CONTRACT.md`.

## Constraints
No service-role key in the application. Never trust `workspace_id` from
the browser. Emails use literal hex colours only. Budget and timeline:
TODO.

## Non-goals
The starter carries no project-specific business logic and no fake data
on production surfaces. Password auth and MFA are out of scope
(magic-link only). Further non-goals: TODO.

## External services
- Supabase — auth, Postgres, storage. `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client-safe).
- Resend — all app and auth email, sent from the email.attomik.co domain
  unless a project overrides it. `RESEND_API_KEY`, `APP_EMAIL_FROM`
  (server-only); Supabase SMTP password as `SMTP_PASS` at
  `supabase config push` time only.
- Vercel — hosting.

## Deployment
Vercel runs `pnpm build`; migrations are applied to production before the
code that needs them (`docs/DEPLOYMENT.md`). Who may deploy a project and
the production Supabase project per clone: TODO.

## Conventions
pnpm (pinned via `packageManager`). `pnpm verify` is repo health
(typecheck, lint, test, build, guardrails); `pnpm verify:db` runs the
local-database checks. The versioned `.githooks/pre-push` (installed by
`prepare`) refuses a push unless `pnpm typecheck` and `pnpm test` pass;
the static UI rules (`src/ui/layout/static-rules.test.ts`) run in
`pnpm test`. Profiles and workspaces are separate from authentication.
Docs index: ARCHITECTURE (map), MODULES (extension contract), NEW_PROJECT
(setup checklist), DEPLOYMENT (Vercel/production), plus one doc per system.

## Current state
Auth, workspaces, team and invitations, audit trail, branding, email,
i18n (en, es-MX), feedback, settings, and the canonical UI primitives are
built. Enabled by default: Overview and Settings; every product module
ships disabled, and Customers and Media are placeholders. Open work:
`docs/tasks.md`.
