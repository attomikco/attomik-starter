# Attomik Starter

A canonical Next.js starter reused across projects. Modules are optional
product functionality enabled per project through configuration — never
delete module code because a project doesn't use it.

## Architecture

- `src/core/` — infrastructure shared by every project. No business logic.
- `src/ui/` — canonical reusable visual components.
- `src/modules/` — optional product functionality, toggled via config.
- Module enablement has ONE source of truth: `src/config/project.ts`
  (flags) + `src/core/modules/registry.ts` (definitions), read through the
  helpers in `src/core/modules`. Never hardcode navigation entries or create
  a second feature-flag system.
- `/design-reference` is READ-ONLY reference material. Never modify, rename,
  move, or delete anything inside it.

## Supabase rules

- Use `src/core/supabase/client.ts` in Client Components.
- Use `src/core/supabase/server.ts` in Server Components, Server Actions,
  and Route Handlers (per request — never a shared singleton).
- Session refresh lives in `src/proxy.ts` → `src/core/supabase/proxy.ts`.
  Never create a second Supabase infrastructure layer.
- Never instantiate Supabase clients ad hoc inside product modules.
- Read env through `src/core/env`, never `process.env` directly.
- Never expose service-role credentials to client code.
- All user/workspace data requires RLS. Do not bypass RLS for convenience.
- Authorization decisions use verified server-side identity
  (`getClaims()` / `getUser()`), never browser state or `getSession()`.
- Conventions: `docs/SUPABASE.md`.
