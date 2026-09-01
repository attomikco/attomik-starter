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

## Schema and migrations

Migrations live in `supabase/migrations` (created with
`supabase migration new`). Workspace schema + RLS model: see
docs/WORKSPACES.md. RLS is mandatory on every exposed table; membership
predicates use the hardened helpers in the non-exposed `private` schema.
Accepted advisor warnings: leaked-password protection and MFA options are
password-auth features — this starter is magic-link only.

## Diagnostics

`GET /api/health/supabase` proves env loading and connectivity (no
application tables, no secrets in the response). Delete it when real
Supabase features make it redundant.
