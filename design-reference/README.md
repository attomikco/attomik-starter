# Admin starter — implementation reference

A brandable admin shell. Two pages, seven mounted components, one skin engine. This file is the contract: read it before copying anything into a project, and pick from the inventory rather than lifting the whole thing.

**How to use this document.** Section 1 tells you what exists. Section 2 is the skin engine, which every project must implement. Section 3 is the architecture and the event contract. Sections 4–6 are the component and screen inventories you select from. Section 7 is the build checklist for a new project. Section 8 is what is deliberately fake.

---

## 1. What ships

| File | Kind | Contains |
| --- | --- | --- |
| `Starter Admin.dc.html` | Page | Shell: rail, command bar, palette, keyboard layer, overlays, toasts. Mounts one area at a time. |
| `Starter Auth.dc.html` | Page | Magic-link sign-in: entry, sent, verifying, expired. |
| `Starter Emails.dc.html` | Page | Seven email templates with a literal-hex palette. |
| `part-overview.dc.html` | Area | Overview, analytics. |
| `part-data.dc.html` | Area | Orders table, customers, search results, inbox. |
| `part-records.dc.html` | Area | Record detail, create/edit, setup wizard, CSV import. |
| `part-queue.dc.html` | Area | Approval queue, schedule. |
| `part-chat.dc.html` | Area | AI assistant, messages console, customer record. |
| `part-settings.dc.html` | Area | Appearance, activity, team, integrations, billing, audit, profile. |
| `part-states.dc.html` | Area | Media library, export centre, six system states. |

Areas are never opened directly. Their page wrapper, rail and command bar collapse when embedded; the host owns that chrome.

---

## 2. The skin engine

This is the part to implement first. Everything else assumes it.

### 2.1 The nine inputs

A brand supplies these and nothing else:

| Key | Type | Meaning |
| --- | --- | --- |
| `ah` | 0–360 | Accent hue |
| `ac` | 0–0.28 | Accent chroma — how loud the brand colour may be |
| `nh` | 0–360 | Neutral hue — which way the greys lean |
| `nc` | 0–0.02 | Neutral chroma — how far from true grey |
| `sc` | 0.06–0.24 | Semantic chroma — intensity of green, amber, red |
| `font` | string | Display and body face |
| `mono` | string | Numeral face |
| `wb` / `ws` | 400–900 | The two emphasis weights |

Two optional keys exist for brands whose accent is a **bright fill** rather than a mid tone (Attomik's `#00FF97` is the case that forced them):

| Key | Meaning |
| --- | --- |
| `al` / `alDark` | Fill lightness in light and dark themes. Default 0.52 / 0.66 |
| `ink` | Lightness of text sitting on that fill. Default is near-white on light, near-black on dark |

Radii (`r`, `r2`, `r3`) live in the same object but are **product** values, not brand values. They are exposed in the Appearance tab because a project may set them once; a client may not.

### 2.2 Why oklch

The first number in `oklch(L C H)` is perceived lightness. That is what lets a single rule hold across hues: "accent text is the accent minus .08 lightness" produces a legible value for a yellow brand and a violet one alike. The same rule in hex requires a human to eyeball it per brand, per theme, which is where drift starts.

### 2.3 The derivation

```
n(l, m)   = oklch(l, nc * m, nh)      // neutral
acc(l, m) = oklch(l, ac * m, ah)      // accent family
sem(l,m,h)= oklch(l, sc * m, h)       // semantic, hue fixed
```

**Surfaces** — light: `--bg` .918, `--shell` .977, `--card` .998, `--line` .895, `--line-2` .82. Dark: .155 / .19 / .225 / .285 / .35. Dark is drawn as a peer, never inverted. A recessed inset is always darker than the panel holding it.

**Text** — four fixed steps: `--txt` .17, `--txt-2` .43, `--txt-3` .59, `--txt-4` .71 (dark: .96 / .74 / .60 / .48). The gap between `--txt-2` and `--txt-3` is what keeps enabled and disabled apart; collapse it and the UI becomes unreadable.

**Accent** — `--accent` (fill), `--accent-ink` (text on the fill), `--accent-text` (accent as text, .44 L light / .80 dark), `--accent-tint` (chip grounds, 10–16% alpha).

**Lead** — `--lead` / `--lead-line`: the one emphasised panel per screen. A tint of the accent, never a black slab.

**Series** — `--s1`…`--s5`: one hue, lightness .34 → .82, chroma tapering ×0.81 / 1 / 0.88 / 0.63 / 0.38. Charts use them in **rank order**, never as categories. Six is the ceiling; a seventh thing becomes "Other" on `--line-2`.

**Semantics** — hues fixed at **147 green, 78 amber, 25 red**, so green means green in every brand. Only chroma follows the accent. Each has three values: text (`--ok`), fill (`--ok-fill`), tint (`--ok-tint`).

### 2.4 What a brand may not set

Radii, spacing, type sizes, grid ratios, hover and pressed states, disabled greys, chart palettes, dark-mode equivalents. A brand that insists on its own corner radius is asking for a different product.

### 2.5 What to ask a brand for

Six things, shown in Settings → Appearance:

1. **One accent colour** — hex or oklch. We read hue and chroma.
2. **One neutral direction** — warm, cool, or true neutral. A single grey from their palette infers it.
3. **Two typefaces** — display/body and a mono. If they have no mono, keep ours.
4. **Two weights** — which weight reads as bold, which as semibold.
5. **Logo, two files** — light ground and dark ground, SVG, legible at 30px.
6. **Favicon** — square mark only, SVG plus a 512px PNG.

### 2.6 Shipped skins

| Skin | Character |
| --- | --- |
| `base` | Cool grey, blue signal. Instrument Sans / IBM Plex Mono, 700 / 600 |
| `electric` | Near-black neutrals, bright green fill (`al` .86, `ink` .16). Barlow / DM Mono, 800 / 600 |
| `green` | Sage on warm forest neutrals. Poppins / IBM Plex Mono, 600 / 500 |

---

## 3. Architecture

### 3.1 Why the areas are separate files

One file meant every navigation click remounted the app, and the runtime cannot evaluate a logic class twice — the second render fell back to markup only and the screen went blank. Splitting the areas fixed it, and it also means each area keeps its own state: a table selection survives a trip to Settings and back.

**Do not merge the parts back into the host.**

### 3.2 The event contract

The host passes **no changing props** to mounts. Anything that changes travels on events:

| Event | Direction | Payload | Purpose |
| --- | --- | --- | --- |
| `starter:nav` | host → parts | `{ screen }` | Which screen the area should show |
| `starter:skin` | part → host | patch object, or `null` to reset | Appearance edits |
| `starter:skinchanged` | host → parts | full skin object | Live values for anything displaying them |
| `starter:toast` | part → host | string | Raise a toast from inside an area |

Globals the host maintains: `window.__starterHost` (true when embedded), `window.__starterScreen`, `window.__starterSkin`.

A real application should replace this seam with a router and a store. It exists because the parts must not re-render from props.

### 3.3 Rules every area follows

```js
componentDidMount() { this.hostSync(); this.apply(); }
embedded() { return !!window.__starterHost; }
apply() { if (this.embedded()) return; /* host owns the tokens */ }
```

- Root element: `position: absolute; inset: 0; display: flex; flex-direction: column`
- Own rail and command bar: `display: none`
- `hostSync()` registers the screen ids the area answers to
- Width comes from the area's **own container** via `rootRef` + ResizeObserver, never `window.innerWidth` — the rail eats 244px and a window-based breakpoint will collapse a wide panel

### 3.4 Breakpoints

Measured against the **panel**, not the window:

| Under | Behaviour |
| --- | --- |
| 1040px | Chat hides the customer context panel (ⓘ re-opens it) |
| 900px | Host rail becomes a drawer; assistant thread rail hides |
| 820px | Approvals stacks; chat record splits to one column |
| 760px | Messages list becomes an overlay behind a back button |
| 720px | Orders table drops its header and wraps into card rows |
| 700px | Settings and records splits go single column |
| 620px | Paired fields and quad stats go single column |

---

## 4. Component inventory

Pick from this list. Each item exists, works, and carries its states. **Roughly 70 components.**

**Shell** — AppShell · sidebar with grouped nav and submenus · NavItem (active / idle / disabled / badge) · collapsible rail 244→76px · CommandBar · MobileBar with drawer and scrim · breadcrumbs · area skeleton loader.

**Keyboard** — ⌘K palette · ⌘/ shortcuts sheet · ⌘B collapse · Esc · `G` then a letter to jump (O R P M A S Q) with an armed hint · A / R / S to decide · J / K to move. Suppressed while a text field has focus.

**Overlays** — command palette · messages and notifications panels · account menu · dropdowns (column picker, date range, status, form selects, font pickers rendering each option in its own face) · date-range picker with a month grid · right drawer · generic confirm (any tone and copy) · destructive confirm with typed confirmation · inline banners in four tones · toasts.

**Data display** — StatCard (lead and neutral) · KPI tile with delta and prior value · bar chart · stacked bar · trend chart with prior-period ghost · gauge · donut · waterfall · heatmap · service matrix (accounts × days, four states, per-row compliance, density toggle, legend filtering) · cohort sparklines · ranked list · timeline · permission matrix (editable).

**Table** — saved views · status tabs · filter builder · column picker with pinned columns · sortable sticky header · selection with a floating bulk bar · inline edit of values and statuses · grouped rows with subtotals · pagination · four data states.

**Forms** — text input with error / valid / hint states and in-field icons · select dropdown · textarea with counter · toggle · checkbox · radio cards · file upload · sliders with swatch presets · sticky save bar · unsaved-changes pill · error summary. Validation is specific: the email field names the missing `@`, the space, or the dotless domain.

**Operator surfaces** — AI draft console (confidence bar with threshold, "Why this draft?" evidence trace of eleven weighted sources each expandable to its snippet and origin, edit-becomes-context loop, regenerate) · approval queue (SLA order, evidence, consequences, note, keyboard decisions) · messages (operator attribution on every outgoing message, in-thread search, context panel, full customer record) · schedule (week grid, capacity warnings, reschedule).

**Data movement** — CSV import (file → mapping with fill rates → preview with per-row reasons → batched import → error report with original line numbers) · media library (usage tracking, orphan flagging) · export centre (progress, size, download, retry, seven-day retention).

**System states** — 404 · permission denied · session expired · offline with a write queue · maintenance with progress · first run as onboarding. Each states the rule behind it.

---

## 5. Screen manifest

Every screen that exists, where it lives, and what is on it. **28 screens across 3 pages.**

### 5.1 Admin — Operate (9)

| Screen | Area | id | What is on it |
| --- | --- | --- | --- |
| Overview | overview | `overview` | Live meta line, 4 stat cards (1 lead), bar chart with one emphasised column, target gauge, ranked channel list, decision list, next-action panel |
| Analytics | overview | `analytics` | Range switcher, 4 KPI tiles, trend chart with prior-period ghost, service matrix, revenue bridge (waterfall), donut share, order heatmap, stacked channel bars, retention cohorts |
| Orders | data | `orders` | The full table: saved views, tabs, filter builder, column picker, sort, selection, bulk bar, inline edit, grouping, pagination, 4 data states |
| Approvals | queue | `queue` | SLA-ordered queue, decision pane with evidence, consequences, note, keyboard decisions |
| Schedule | queue | `schedule` | Week grid with capacity warnings, job panel, reschedule options |
| Customers | data | `customers` | Same table engine, different columns |
| Inbox | data | `inbox` | Notification list, unread state, mark all read |
| Messages | chat | `messages` | Conversation list, thread with attribution, AI draft console, context panel, customer record |
| Assistant | chat | `assistant` | Thread rail, model selector, suggestions, answers with tables and source chips |

### 5.2 Admin — Configure (5+)

| Screen | Area | id | What is on it |
| --- | --- | --- | --- |
| Setup wizard | records | `wizard` | 4 steps, progress rail, source picker, field mapping, rules with consequences, review |
| Import a file | records | `import` | Drop zone → mapping with fill rates → preview with per-row reasons → batched import → error report |
| Media library | states | `media` | File grid, type tabs, unused filter, search, upload, usage per file |
| Export centre | states | `exports` | Job list with progress, size, download / cancel / retry, retention note |
| System states | states | `states` | Six states, tabbed (see 5.5) |
| Record detail | records | `record` | Tabbed record: overview, activity, notes, files; line items, refund panel, customer, shipping |
| Create / edit | records | `form` | Validated form, radio cards, toggles, counters, dirty state, sticky save bar |
| Customer record | chat | (in-area) | Identity, 4 KPIs, tabs for activity / orders / conversations / preferences, health score, contact, notes |

### 5.3 Admin — Settings (7)

| Screen | id | What is on it |
| --- | --- | --- |
| Activity | `activity` | Every action by person, grouped by day, filters, search, 4 stat tiles, row → diff drawer |
| Appearance & brand | `appearance` | Brand intake spec, logo and favicon upload, colour sliders and swatches, type dropdowns, radii, presets, live preview, derivation rules, resolved tokens |
| Team & permissions | `team` | Seat stats, member table with role dropdowns, editable permission matrix, invite dialog |
| Integrations | `integrations` | Six services, connect / disconnect, status, configure |
| Billing | `billing` | Plan panel, seat usage, payment method, billing details, invoice table |
| Audit log | `audit` | Filters, search, action chips, row → before/after diff drawer |
| Profile | `profile` | Editable fields with validation, language and region, notification toggles, active sessions, danger zone |

### 5.4 Auth page (4 states)

| State | What is on it |
| --- | --- |
| Entry | Email field with live validation, SSO alternative, terms line |
| Sent | Check-your-inbox, 30s resend cooldown, troubleshooting list, change address |
| Verifying | Three-step verification walk with per-step ticks |
| Expired | Reason, time since request, request a new link, change address |

Shared: centred card with a fixed position across all four states, logo slot, step label, security facts line, state switcher for review.

### 5.5 System states (6)

404 · permission denied (role held vs role needed) · session expired (work preserved) · offline and reconnecting (write queue, retry countdown) · maintenance (progress and ETA) · first run (four-step onboarding). Each carries the rule behind it.

### 5.6 Email templates (7)

| Template | Kind | Blocks |
| --- | --- | --- |
| Magic link | Transactional · auth | Brand row, heading, body, button, URL fallback, callout, footer |
| Login code | Transactional · auth | Code block at 30px with letter-spacing, expiry line |
| Workspace invite | Transactional · membership | Button, detail table (workspace, role, inviter, seats left) |
| Refund approved | Transactional · receipt | Status badge, detail table, receipt note |
| Payment failed | Transactional · alert | Status badge, retry button, detail table |
| Weekly digest | Scheduled · digest | Metric grid, detail table, button, unsubscribe |
| Monthly summary | Scheduled · summary | Metric grid, channel table, callout, button |

Each renders in light and dark, at desktop and mobile width, with sender chrome, preheader, and a footer that says why it was received.

---

## 6. Emails

Email is the one place tokens do **not** apply: mail clients strip custom properties. The palette is resolved to literal hex at send time from the same skin. Rules: one job per email; the subject carries the fact; every button has a plain-text URL fallback; the footer always says why they received it; 620px single column, 15px body; scheduled mail can be unsubscribed, transactional cannot.

Templates: magic link · login code · workspace invite · refund approved · payment failed · weekly digest · monthly summary.

---

## 7. Adopting this in a project

1. **Copy the shell and only the areas you need.** Delete the rest of the `part-*` files and their rail entries. Nothing cross-references between areas except through events.
2. **Set the skin.** Add a preset to `SKINS` in the host *and in every part you kept* — each carries its own copy so it can be opened standalone. Extract the client's own neutrals; a warm brand on cool greys is what makes a re-skin look wrong.
3. **Replace the event seam.** `starter:nav` becomes your router; `starter:skin` becomes your settings store. Keep `embedded()` so the areas never fight the host over tokens.
4. **Swap the data.** Each area holds its mock data in a `static get` at the top of its logic class. Replace those with your fetches; the render layer does not care.
5. **Keep the non-negotiables** (section 9). They are the reason the screens look coherent.
6. **Re-check both themes and at least two skins** before shipping. A layout change lands in every skin or it does not land.

### Adding a screen

Add an `sc-if` block inside the relevant area, register its id in that area's `hostSync` list, then add a rail entry in `Starter Admin.dc.html` (`navGroups`) pointing at the area and id. Give it its **own** screen id — two rail items sharing an id both render as active.

### Adding an area

Copy an existing part: root at `position: absolute; inset: 0`, rail hidden, `apply()` skipped when `embedded()`, mounted from the host with `dc-import` and no changing props.

---

## 8. What is deliberately fake

- **Data is authored.** Every list, chart and metric is a literal in the logic class. Nothing persists across reload.
- **Charts are hand-built SVG**, not a charting library. They are correct for the data they contain and will not scale to arbitrary series.
- **The AI console is a prototype.** Confidence, evidence and drafts are written, not retrieved. The *pattern* is the deliverable: show what was read, weight it, let the operator correct it, and say that the correction becomes context.
- **Auth has no backend.** The magic-link flow is state, not sessions.
- **The language selector does not translate.** It stores a choice and shows a format preview.

---

## 9. Non-negotiables

1. No hex literals in components. Every colour resolves to a token. Emails are the stated exception.
2. One number per screen is unmistakably the largest thing.
3. No delta chip without a real prior value. If the baseline is missing, say "No prior period".
4. Never a directional arrow on a 0.0% change.
5. A metric that fell is neutral, never red. Red means broken.
6. Light and dark are peer palettes, never a filter or an inversion.
7. Accent appears at most three times per screen.
8. Emphasis in charts must survive a static screenshot. Hover is not encoding.
9. Never invent an interface. If the data is not real, show the empty state.
10. Mono for every numeral, unit, timestamp and ID.
11. Anything an AI drafted must show what it read.
12. A layout change lands in every skin, or it does not land.

---

## 10. Known gaps

- Below ~620px the areas degrade but are not designed. A phone build needs its own pass.
- Focus rings and tab order are browser defaults; the keyboard layer covers navigation, not accessibility.
- No print stylesheet. Invoices and analytics are the two things people will try to print.
- Number, date and currency formatting are displayed as a choice but not applied.
