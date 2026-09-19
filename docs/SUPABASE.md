# Supabase conventions

One Supabase integration exists. Do not create another.

## Environment

Read credentials through `src/core/env` (`getSupabaseEnv` / `hasSupabaseEnv`),
never `process.env` directly. Required variables (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Validation is lazy: the app builds without credentials and throws a clear
error when Supabase is actually invoked.

## Browser usage

```ts
import { createClient } from "@/core/supabase/client"
```

Client Components only. Prefer server-side data access; reach for the browser
client only when the interaction genuinely lives in the browser (realtime,
optimistic UI).

## Server usage

```ts
import { createClient } from "@/core/supabase/server"
const supabase = await createClient()
```

Server Components, Server Actions, Route Handlers. Created per request —
never module-level, never cached across requests.

The factory opts every PostgREST call out of Next/React render-pass fetch
memoization (`cache: "no-store"` + a per-call abort signal): identical
GETs in one render otherwise share the first response, so a
read-after-write — like the workspace bootstrap's membership retry —
would see stale pre-write data. Deduplicate at our layer (React `cache`
on `requireWorkspace`), never by relying on fetch memoization.

## Session refresh

`src/proxy.ts` (Next.js 16 proxy) → `updateSession()` in
`src/core/supabase/proxy.ts`. It calls `supabase.auth.getClaims()` to
validate/refresh the token and forwards refreshed cookies to Server
Components and the browser. If you later return a custom response from the
proxy, copy the cookies from `supabaseResponse` onto it.

## Rules

- Never instantiate Supabase clients directly inside modules; import the two
  factories above. Never create module-specific client factories.
- Never expose server secrets to the browser (`NEXT_PUBLIC_*` is public).
- Never use a service-role key for normal user requests.
- RLS is mandatory for user/workspace data. Every future user-owned or
  product-owned table is designed with RLS from the start.
- Authorization uses verified server-side identity — `getClaims()` for
  protecting pages/data, `getUser()` when you need the fresh user record.
  Never trust `getSession()` or browser state for authorization.
- **Write SELECT policies in the set form:**
  `workspace_id IN (SELECT private.member_workspace_ids())`, never
  `private.is_workspace_member(workspace_id)`. A function taking the row's
  column is called once per row scanned; the set form is one uncorrelated
  subquery the planner hashes once (300k `activity_events`: ~800 ms → ~25 ms
  as an authenticated member). `is_workspace_member()` stays for single-id
  checks (server code, INSERT/UPDATE checks). Time any new read model as an
  `authenticated` member, never as the table owner, which bypasses RLS and
  hides the cost.

## Schema and migrations

Migrations live in `supabase/migrations` (created with
`supabase migration new`). Workspace schema + RLS model: see
docs/WORKSPACES.md. RLS is mandatory on every exposed table; membership
predicates use the hardened helpers in the non-exposed `private` schema.
Accepted advisor findings: leaked-password protection and MFA options
(password-auth features — this starter is magic-link only), the three
RPC-callable SECURITY DEFINER functions (their documented purpose), and
INFO-level unindexed actor/creator FK columns (low-value at these sizes —
add per project if audit queries by actor become hot).

## Table grants: expose every table explicitly

A Supabase project or local stack from a recent CLI grants nothing on new
`public` tables to the Data API roles (older hosted projects still carry the
implicit defaults). A migration that only creates a table and enables RLS
therefore ships a database where every query fails with `permission denied for
table ...`. So every migration that creates a table or view calls, right after
it:

```sql
create table public.things (...);
alter table public.things enable row level security;
-- policies ...
select private.expose_table('public.things');   -- select/insert/update/delete (views: select) to authenticated, service_role
```

`private.expose_table()` (migration `20260919130000`) never grants to `anon`:
something intentionally public gets its own `grant ... to anon` next to its
policy, with a comment saying why (today only `get_auth_branding()`, an RPC). It
refuses a table with RLS disabled. It is additive and safe to repeat, so
projects with the old implicit grants are unaffected.

`supabase/tests/table_grants.sql` fails on any public table or view the roles
cannot use, and checks its own detection with a probe table. Run it on a FRESH
local stack (an old hosted project's implicit grants would hide a missing call).

## Tests

`supabase/tests/*.sql` are plain-SQL RLS assertions (no pgTAP), each one
transaction that rolls back. They act as the real `authenticated` role via
`request.jwt.claim.sub` and raise on the first failed assertion:

```sh
supabase start && pnpm test:db      # every supabase/tests/*.sql, stops at the first failure
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/feedback_rls.sql   # or one file
```

`pnpm test:db` (scripts/run-db-tests.sh) reads the local stack's `DB_URL`,
refuses anything that is not loopback, and uses `psql` or the local Postgres
container. Run the tests against a local stack with every migration applied,
never production.

## End-to-end tests (Playwright)

The e2e suite creates and deletes real auth users, workspaces and rows, so it runs
against a **local** Supabase stack and never a hosted project.

```bash
supabase start                 # applies supabase/migrations to a fresh local database
supabase status -o env         # API_URL, ANON_KEY (or PUBLISHABLE_KEY), SERVICE_ROLE_KEY (or SECRET_KEY)

E2E_SUPABASE_URL=<API_URL> \
E2E_SUPABASE_PUBLISHABLE_KEY=<anon or publishable key> \
E2E_SUPABASE_SERVICE_ROLE_KEY=<service role or secret key> \
pnpm e2e
```

`E2E_SUPABASE_URL` defaults to `http://127.0.0.1:54321`; nothing is read from
`.env.local`. `e2e/support/target.ts` (unit-tested by `pnpm test`) allowlists
loopback URLs and refuses hosted URLs and hosted-project keys. Another project's
stack on the default ports makes `supabase start` fail with "port is already
allocated": run this repo's stack from a scratch copy of `supabase/` whose
`config.toml` sets other ports and another `project_id` (`supabase start --workdir <dir>`).
The stack needs the table grants from migration `20260919130000` (see Table grants).

### Mobile layout guard

`e2e/mobile-overflow.spec.ts` visits every page route (read from
`src/app/**/page.tsx`, plus a 404) at 390x844 with a seeded workspace
(`e2e/support/seed.ts`) and fails if the document is wider than the viewport or any
visible element's right edge is past it (`e2e/support/overflow.ts` explains why the
element check is the one that matters: the shell clips overflow inside `.sh-scroll`,
so the document never widens). Navigation and measurement only, no clicks. A new
`[param]` route needs a value in `e2e/support/routes.ts`, and a project should add its
module tables to `seed.ts` so its list and record routes render real content.
`E2E_SCREENSHOTS=1` also writes a viewport and a full-length screenshot per route to
`e2e/screenshots/` (gitignored); `E2E_ROUTES=/settings,/login` limits the pass.

Layout primitives that keep this green: grids use `minmax(min(Npx, 100%), 1fr)`, never a
bare pixel minimum; text in a flex row uses `.sh-ellipsis`; page-header buttons live in
`.sh-actions` and wrap instead of shrinking (a button never ellipsizes its label); the
DataTable's phone layout lets a value shrink and wrap.

## Pre-push migration guard (opt-in)

`.githooks/pre-push` runs `scripts/check-migrations-pushed.ts`, which asks
`supabase migration list --linked` and refuses the push while any local
migration file has no matching version on the linked project — a migration
landing after the code that needs it breaks the deploy in between. It only
warns (never blocks) when the CLI is missing, the project is unlinked or
unreachable. Turn it on once per clone, after linking your own project and
pushing (so local and remote versions match):

```sh
pnpm hooks:install
```

It is not wired into `prepare` on purpose: it compares versions, so it is
only meaningful once the project's history is in sync.

## Diagnostics

`GET /api/health/supabase` is the v1 production health endpoint (used by
docs/DEPLOYMENT.md post-deploy checks): generic ok/reason JSON, no
credentials or internals. Intentionally available in production.
