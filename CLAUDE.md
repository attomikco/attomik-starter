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

## Production surface rules

- /dev/* review tools are development-only: blocked at the proxy in
  production (true 404) and gated by requireDevelopment() in each page.
- No fake people, notifications, or data on production surfaces; shell
  affordances for disabled modules stay out of the default UI.
- Disabled module routes are proxy-blocked (true 404) AND page-guarded by
  requireModule(); nav/palette derive from the registry, so disabled
  modules appear nowhere.
- docs/: ARCHITECTURE (map), MODULES (extension contract), NEW_PROJECT
  (setup checklist), DEPLOYMENT (Vercel/production).

## Data / CRUD rules

- Reuse the canonical DataTable (src/ui/data) before creating
  module-specific tables; never duplicate table components inside modules.
- Reuse the canonical four data states (loading/ready/empty/error).
- Domain modules provide columns, filters, and actions; UI/data components
  never encode Customer/Order/etc. business logic.
- Tables must stay compatible with server-side pagination/filtering — the
  serializable SortState/FilterCondition/PageState shapes travel to APIs.
- Standard CRUD forms use explicit save (SaveBar) unless the module has a
  clear reason for autosave; Appearance is the documented exception.
- Destructive actions use the canonical ConfirmDialog, never confirm().
- Never invent a new table/form visual language when the reference pattern
  exists. Details: docs/DATA.md.

## Audit rules

- Meaningful state-changing mutations emit canonical activity events —
  critical starter paths via database triggers (atomic, unforgeable),
  future module events via recordActivity() (src/core/audit).
- Never log secrets, tokens, credentials, or sensitive payloads.
- Audit rows are workspace-scoped and append-only; the browser cannot
  forge rows (no insert policy; RPC forces the verified actor).
- Store structured events + changed-field diffs; render human summaries
  in the UI via summarizeEvent — never persist prose.
- record_activity() requires member rank or above: viewers are read-only
  and never author events (canRecordActivity() mirrors the database rule).
- No module-specific audit tables. Details: docs/AUDIT.md.

## Email rules

- `src/core/email` is the ONE email layer: the catalog
  (`templates.ts`), the renderer, the palettes, and the text part. Never
  write email HTML anywhere else, and never add a second template
  language or a module-specific email.
- Emails are block lists, not markup. Words come from the shell
  dictionary (`copy.email.*`) in every locale.
- Literal hex only — mail clients strip custom properties and oklch.
  Colours resolve from the same skin at send time (`emailBrand()`).
- Every button ships the same URL as plain text; every email says why it
  was received. Both are enforced by tests.
- Supabase Auth templates in `supabase/templates/*.html` are GENERATED
  (`pnpm build:auth-emails`) — never hand-edit them, and re-run after
  changing copy, the project skin, or the project locale.
- Auth mail carries the PROJECT skin and locale (no workspace exists at
  sign-in); app-sent mail carries the workspace's. Settings → Emails says
  which, per template, and is read-only.
- Details: docs/EMAIL.md.

## Team / permission rules

- Authorization comes from workspace_members via src/core/permissions;
  UI visibility is never the authorization boundary — sensitive actions
  re-check server-side and RLS enforces the same matrix.
- Never use user_metadata for roles.
- Preserve at least one workspace owner; admins cannot modify or create
  owners (owner rows are API-untouchable).
- Invitations are single-use, expiring, and email-bound; resend rotates
  the token.
- Removing a member never deletes their auth account.
- All app/auth email sends from the email.attomik.co domain via Resend.
- Team UI uses the canonical Task 007 data/form/confirmation primitives.
- Details: docs/TEAM.md.

## Workspace rules

- All product data belongs to a workspace unless explicitly global.
- Never trust workspace_id from the browser without server/RLS validation.
- RLS must enforce workspace membership on every table.
- Authorization roles come from workspace_members, never user_metadata.
- Modules use the canonical workspace access layer (src/core/workspace) —
  never their own queries against workspace tables.
- Locale has three owners: project default in `src/config/project.ts`
  (developer configuration), workspace default on Settings → General
  (owner/admin), personal language in the account menu (`profiles.locale`,
  own row only). Resolution is personal → workspace → project; never add a
  second place to edit any of them.

## Brand persistence rules

- Persist SkinInput values, not resolved CSS variables.
- Appearance edits workspace settings through the canonical server layer
  (src/modules/settings/appearance/actions.ts).
- Do not add arbitrary brand controls; radii are interface geometry —
  persisted per workspace and editable in Appearance's Shape card, but
  never part of SkinInput or the brand derivation. Exactly three tokens.
- Workspace branding must render server-first (no default-skin flash).

## Auth rules

- App routes require verified server-side Supabase identity
  (`getClaims()`); never trust browser session state or `getSession()` for
  authorization.
- Use the canonical helpers in `src/core/auth` and the canonical Supabase
  clients — no ad hoc Supabase clients.
- Validate every post-login redirect target with `sanitizeNextPath()`;
  local paths only.
- Never reveal whether an email exists (the Sent state is identical either
  way).
- Profiles/workspaces are separate from authentication (Task 006+).
- /design-reference remains the auth visual source of truth.
- Production auth email uses configured SMTP (Resend via
  supabase/config.toml), never Supabase's shared default sender.
- Never commit SMTP credentials; the key is passed as env(SMTP_PASS) at
  `supabase config push` time only.
- Rate-limit errors may be shown generically (they disclose nothing);
  account existence must remain undisclosed in every other case.
- Custom React Email auth templates are a later concern.
- Details: docs/AUTH.md.

## Shell rules

- AppShell (`src/ui/shell`) is canonical.
- Modules never create their own application rail or top bar.
- Navigation always comes from the module registry — never hardcode it.
- Do not duplicate command palette destinations; they derive from the same
  enabled navigation.
- Do not create module-specific toast systems; use `useToast()`.
- Shell colors consume canonical theme tokens only.
- Route state determines active navigation — no selected-screen state.
- Every user-facing string comes from `src/core/i18n`: the shell
  dictionary (chrome, data primitives, auth, errors, audit summaries,
  emails, navigation names under `nav.modules`) and each module's own
  `copy.ts` (`defineCopy`, English dotted keys). The active locale is
  per USER (profile → workspace default → `projectConfig.locale`),
  resolved server-side once per request and applied server-first; read
  it through `useCopy()`/`useT()`/`useFormat()` on the client and
  `getCopy()`/`getT()`/`getFormat()` on the server. Never hardcode a
  user-facing string, never import a fixed locale, never add a second
  i18n mechanism, never call `toLocaleString` directly. English is the
  source locale; es-MX values follow sentence case. Details: docs/I18N.md.
- The registry holds identifiers only; on-screen module names live in
  the dictionary and resolve at navigation-build time.
- /design-reference is the visual/behavioral source of truth.
- Details: docs/SHELL.md.

## Branding / theme rules

- The skin derivation engine (`src/core/branding`) is canonical.
- Never hardcode brand colors in components; consume CSS custom properties.
- Never create module-specific themes.
- Never duplicate the OKLCH derivation logic.
- Light and dark are independent peer palettes, never an inversion.
- Semantic hues are fixed (147 green, 78 amber, 25 red); only chroma follows
  the brand.
- Red is reserved for errors/destructive/broken states — a metric that fell
  is neutral, not red.
- Product geometry (radii, spacing, sizes) is not client branding.
- /design-reference remains the source of truth for visual behavior.
- Contract: docs/BRANDING.md.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
