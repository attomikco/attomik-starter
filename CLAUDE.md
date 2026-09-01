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

## Workspace rules

- All product data belongs to a workspace unless explicitly global.
- Never trust workspace_id from the browser without server/RLS validation.
- RLS must enforce workspace membership on every table.
- Authorization roles come from workspace_members, never user_metadata.
- Modules use the canonical workspace access layer (src/core/workspace) —
  never their own queries against workspace tables.

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
