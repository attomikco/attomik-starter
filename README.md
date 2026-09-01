# Attomik Starter

The canonical Attomik foundation for multi-user product applications:
one codebase cloned per project, configured — never rewritten.

**Stack**: Next.js (App Router, TypeScript) · Supabase (auth, Postgres +
RLS, storage) · Resend (email) · Vercel.

## What you get

- Magic-link auth with protected app routes and session refresh
- Workspaces with owner/admin/member/viewer roles, invitations, and an
  append-only audit trail (Settings → Activity)
- A brandable OKLCH skin engine: per-workspace colors, type, logos, radii,
  light/dark/system — edited live in Settings → Appearance, rendered
  server-first
- A registry-driven module system: sidebar, palette, and routes all derive
  from `src/config/project.ts` + `src/core/modules/registry.ts`
- Canonical UI primitives (shell, tables, forms, dialogs, states) ported
  from the design reference in `/design-reference` (read-only inventory)

## Quick start

```bash
pnpm install
cp .env.example .env.local        # fill in Supabase URL + publishable key
pnpm dev                          # http://localhost:3000
```

Sign in with a magic link; the first login bootstraps your workspace.
Full project setup (Supabase project, auth SMTP via Resend, deployment):
**docs/NEW_PROJECT.md** — follow it verbatim for a new product.

## Configure

- **Identity**: `src/config/project.ts` → `name` (used until Appearance is
  configured), plus module flags. Default surface is deliberately minimal:
  Overview + Settings; everything else ships disabled.
- **Branding**: Settings → Appearance (persists per workspace).
- **Modules**: flip a flag, add registry metadata, guard the route —
  contract in **docs/MODULES.md**.
- **Migrations**: `supabase migration new <name>`, files in
  `supabase/migrations/`; auth config is code in `supabase/config.toml`
  (`SMTP_PASS=<resend key> supabase config push`).

## Commands

`pnpm dev` · `pnpm build` · `pnpm start` · `pnpm test` (node runner) ·
`pnpm typecheck`

## Documentation

| Doc | Covers |
| --- | --- |
| docs/NEW_PROJECT.md | exact new-project checklist |
| docs/DEPLOYMENT.md | Vercel + production config |
| docs/ARCHITECTURE.md | technical map |
| docs/MODULES.md | module extension contract |
| docs/SUPABASE.md · AUTH · WORKSPACES · TEAM · AUDIT | backend systems |
| docs/BRANDING.md · DATA.md · SHELL.md | UI systems |

`/design-reference` is the visual blueprint inventory for future modules —
read-only, never production runtime. Dev review tools live under `/dev/*`
and are blocked in production builds.
