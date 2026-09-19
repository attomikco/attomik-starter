# Feedback

In-app feedback capture: a floating widget on every authenticated screen
lets any workspace member drop a short note; owners and admins read it back
at Settings → Feedback, and mark it resolved. It is starter infrastructure
behind a feature flag, not a module — it has no product routes of its own.

Turn it on in `src/config/project.ts`:

```ts
features: { feedbackWidget: true }
```

The flag drives the widget (`AppShell`), the Settings → Feedback nav row
(`feature` on the registry child), the proxy's true 404 for
`/settings/feedback`, and the page guard (`requireFeature()`), all through
`src/core/config/features.ts`. Apply both migrations before enabling it.

## Data

| Table | Written by | Read by |
| --- | --- | --- |
| `feedback` | any member, as themselves | owner/admin |
| `feedback_resolutions` | owner/admin, as themselves | owner/admin |

Both are append-only: no update or delete policy exists. "Resolved" is
derived from a `feedback_resolutions` row existing (unique per feedback
row) — there is no status column, and feedback itself is never edited.
`workspace_id`, `user_id`, `route`, `user_agent` and viewport are attached
server-side (`submitFeedback`), never typed by the caller; the RLS insert
policies force the same pairing independently. `resolved_by` is forced to the
verified actor and set to null (not cascaded) if that account is removed.

## Resolving

`resolveFeedback()` (`src/core/feedback/actions.ts`) is one action: insert
the resolution, record a `feedback.resolved` audit event (counts only, never
the note), then email the members the resolver ticked (administrators are
pre-checked) with the `feedback_resolved` template. The resolution is the
point of no return: a failed send is reported as `email: "failed"` for the UI
to warn about and never undoes it. Recipients are re-derived from current
members server-side — a stale or forged id is dropped.

## Screen rules (Settings → Feedback)

- Table cells never render long text. Comment and resolution-note cells clamp
  to two lines (max ~40ch), user and route to one. Full text lives in the
  row-click `DetailDrawer` (`src/ui/records`), where it wraps normally:
  comment, submitter, date, route, type, and — once resolved — the whole
  resolution with resolver, date and the members notified.
- The screen root is the shell's `.sh-scroll` region and the table uses
  `layout="auto"`: the page scrolls, the table scrolls horizontally only.
  Never give the table a fixed height or an `overflow: hidden` ancestor here.
- Resolve uses the screen's own dialog (note + notify list); it states up
  front that resolving is permanent.
