# Roadmap — architectural follow-ups

Real findings from the first project bootstrapped off the starter
(recorded 2026-09-01). These are **not implemented**; each needs its own
task with a spec. Do not patch around them in project clones without
first deciding the canonical seam here.

## 1. Shell localization seam — implemented

Shipped as `src/core/i18n` + `projectConfig.locale` (`en`, `es-MX`); see
docs/SHELL.md §Locale. Remaining gap: the module registry's navigation
labels are still module definitions edited per project. Original finding:

**Problem.** The shell owns hardcoded English strings: navigation group
labels (`GROUP_LABELS` in `src/core/navigation/build.ts`), the command-bar
and palette placeholder ("Search screens and actions"), the shortcuts
sheet, toast/confirm copy in canonical primitives, and the document
language on `<html>`. A multilingual product currently has to edit core
files directly, which forks the starter.

**Why it belongs in the starter.** Localization is infrastructure, not
product functionality. If every non-English project patches core strings
in place, upstream starter updates stop merging cleanly and the "modules
never touch core" rule is broken by the first Spanish-language client.

**Likely boundary.** A canonical string/locale layer in `src/core` (e.g.
`src/core/i18n`) that shell and canonical UI primitives read from, with
the project supplying a locale pack via `src/config/project.ts` — the
same one-source-of-truth pattern as module enablement. Document language
flows from the same config into the root layout. No per-module
translation frameworks.

## 2. Module-provided Activity summaries

**Problem.** `summarizeEvent` / `eventVerb` / `eventTone` in
`src/core/audit/summaries.ts` know only the core event names. A project
module recording its own events via `recordActivity()` (dot.snake action
names) gets raw fallbacks in the Activity screen unless it edits that
core file — which the module contract forbids.

**Why it belongs in the starter.** The audit foundation explicitly
invites module events ("future module events via recordActivity()"), so
the render side needs the matching extension point. Without it, every
project's first custom event forces a core edit.

**Likely boundary.** A summarizer registration keyed by action-name
prefix (e.g. the module id), declared as plain data/functions alongside
the module's definition and consumed by the Activity screen through the
existing registry — never a second audit table or a module-owned Activity
UI. Core event summaries stay in core; the registry only extends.

## 3. Bootstrap skin / project identity

**Problem.** A fresh workspace renders the neutral default skin until
someone configures Settings → Appearance. For a client project the very
first login shows the wrong identity, and the first-run experience
depends on a human remembering to configure branding.

**Why it belongs in the starter.** Every clone hits this on day one. The
workspace Appearance system is canonical; projects should not invent
seed scripts or hardcode brand tokens to get a branded first paint.

**Likely boundary.** An optional initial-identity block in
`src/config/project.ts` (SkinInput values + logo assets — the same
persisted shapes from `src/core/branding/persistence.ts`, never resolved
CSS) consumed once by the workspace bootstrap in `src/core/workspace`
when it creates the workspace row. Appearance remains the runtime source
of truth afterwards; the config seed is only the starting value.
