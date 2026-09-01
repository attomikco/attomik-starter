# Module contract

How a project adds product functionality (Messages, Media, Approvals, a
custom domain module…) without touching core.

## The three switches

1. `src/config/project.ts` — add/enable the flag: `messages: true`.
2. `src/core/modules/registry.ts` — the definition: id, label, description,
   permissions, dependencies, and `navigation` (group, label, icon key,
   href, order, optional `children` submenu). Plain data only — no React.
3. Routes under `src/app/(app)/<path>/page.tsx` calling
   `requireModule("messages")` before rendering, delegating to
   `src/modules/messages/`.

That is the whole integration: sidebar, mobile drawer, command palette,
and route guards all derive from the registry + config. Disabled modules
vanish everywhere and their routes 404; their client code stays out of
other pages via Next.js route splitting.

## What a module OWNS

- Its routes, loading skeletons, and screens (`src/modules/<id>/`)
- Its server queries and server actions (workspace-scoped, RLS-backed)
- Its migrations (see the install convention below)
- Its permission strings (declared in the registry)
- Its storage bucket/paths if needed (workspace-scoped policies)
- Custom audit events via `recordActivity()` (dot.snake action names)

## What a module must NOT own

- The AppShell, navigation, or another sidebar
- Supabase client factories (use `core/supabase/{client,server}`)
- A toast system (use `useToast()`)
- A theme engine or hardcoded brand colors (tokens only)
- Workspace resolution (use `core/workspace`)
- Its own table/form/confirm visual language (use `src/ui/data`,
  `src/ui/forms`, `src/ui/records`)
- An audit table (use `activity_events`)

## Backend install convention

The master repo may carry optional module CODE for every module, but a
fresh project provisions only what it enables:

- Core migrations (workspace/team/audit) always apply.
- Optional module migrations live in `supabase/modules/<id>/` and are
  copied into `supabase/migrations/` (then applied) only when the project
  enables the module. Keep each module's schema self-contained,
  RLS-enabled, and workspace-scoped. No installer CLI yet — this manual
  convention is v1.

## Minimal template

```
src/modules/messages/
  index.tsx        server entry: requireWorkspace → data → screen
  screen.tsx       "use client" UI built from src/ui primitives
  actions.ts       "use server" mutations (validate → RLS write)
src/app/(app)/messages/page.tsx
  requireModule("messages"); return <MessagesModule />
src/app/(app)/messages/loading.tsx   destination skeleton
supabase/modules/messages/0001_messages.sql
```

Design blueprints for the reference modules live in `/design-reference`
(part-chat, part-queue, part-states…) — port visuals from there, never
invent a new design language.
