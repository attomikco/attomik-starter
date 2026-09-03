# Architecture

Attomik Starter is a canonical Next.js (App Router) + Supabase + Vercel +
Resend foundation, reused across projects by enabling modules — never by
rewriting core.

## Layers

```
src/config/project.ts   per-project switches: name, module flags, features
src/core/               infrastructure shared by every project
  modules/              registry + enablement (ONE source of truth)
  navigation/           nav derived from the registry
  branding/             OKLCH skin engine + persistence mapping
  supabase/             the only client factories + session proxy
  auth/                 magic-link helpers, redirects, validation
  workspace/            canonical user→workspace→settings resolution
  permissions/          role capability model (mirrored by RLS)
  team/                 members + invitation lifecycle
  email/                the ONE email catalog + renderer (light/dark, text)
  audit/                activity events (reads, summaries, custom recorder)
  data/                 domain-agnostic table/query primitives
  env/, dev.ts          env validation, dev-tooling gate
src/ui/                 canonical visual components (shell, data, forms,
                        records) — ported from /design-reference
src/modules/            optional product functionality, config-toggled
src/app/                routes; (app) = authenticated shell, (auth) = light
                        auth surface, /dev/* = development-only reviews
supabase/               config.toml (auth as code) + migrations
/design-reference       READ-ONLY visual blueprints for future modules —
                        reference inventory, not production runtime
```

## Core flows

- **Request**: proxy refreshes the Supabase session (getClaims) and
  redirects signed-out navigations; (app) layout re-verifies, resolves the
  workspace (bootstrap on first sign-in), and injects the workspace skin
  stylesheet server-first.
- **Theme**: preference (light|dark|system) → resolved theme via one pure
  chain (`ui/shell/theme-resolve`), applied pre-paint and kept live.
- **Data**: RLS on every table; roles from workspace_members; audit events
  written by database triggers; server-paginated reads.
- **UI**: server components fetch; small client islands interact; all
  colors are theme tokens.

Detailed docs: MODULES, SUPABASE, AUTH, WORKSPACES, BRANDING, DATA, TEAM,
EMAIL, AUDIT, NEW_PROJECT, DEPLOYMENT.

## Settings map

Settings is a core-adjacent module registered like any other:

| Route | Owns | Who edits |
| --- | --- | --- |
| `/settings/general` | workspace name, default language | owner, admin |
| `/settings/appearance` | logos, favicon, colours, type, shape, default appearance | owner, admin |
| `/settings/team` | members, roles, invitations | owner, admin (viewers read) |
| `/settings/emails` | every transactional email, previewed as sent | owner, admin (read-only) |
| `/settings/activity` | audit log | members |

Personal preferences (interface language, theme) live in the account menu,
not under Settings — every role sets their own. Project defaults
(`src/config/project.ts`: locale, bootstrap skin, modules) are developer
configuration, never editable in the app.
