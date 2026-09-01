# Implementation guide

How to turn this bundle into a running application. This is the only codebase — nothing else is assumed.

Read `README.md` first for the system itself (skin engine, screen manifest, component inventory, rules). This document covers **making it functional**.

---

## 1. What you are starting with

Twelve files. Nothing else is needed to run it.

```
Starter Admin.dc.html     the app shell + host
Starter Auth.dc.html      sign-in, 4 states
Starter Emails.dc.html    7 email templates
part-overview.dc.html     overview, analytics
part-data.dc.html         table: orders, customers, search, inbox
part-records.dc.html      record detail, forms, wizard, CSV import
part-queue.dc.html        approvals, schedule
part-chat.dc.html         assistant, messages, customer record
part-settings.dc.html     settings, activity, appearance
part-states.dc.html       media, exports, system states
support.js                runtime (do not edit)
README.md                 the system contract
```

Open `Starter Admin.dc.html` in a browser. It runs with no build step, no server, no dependencies. That property is worth keeping as long as you can.

---

## 2. Decide the target first

Three honest paths. Pick one before you write anything.

| Path | When it is right | Cost |
| --- | --- | --- |
| **A. Keep as-is, add a backend** | Internal tool, one team, speed matters | Days |
| **B. Port to React + Vite** | Real product, multiple developers, needs tests | 2–3 weeks |
| **C. Port to Next.js** | Public product, SEO, server rendering, auth sessions | 3–4 weeks |

Most projects that adopt this should start at **A**, prove the product, then move to **B** when a second developer joins. Porting early costs weeks and changes nothing a user sees.

The rest of this document covers A in full, then what changes for B and C.

---

## 3. Path A — make this bundle functional

### 3.1 Serve it

```bash
npx serve .          # or: python3 -m http.server 8000
```

Open `http://localhost:3000/Starter%20Admin.dc.html`. Everything works except data persistence.

### 3.2 Turn off the design chrome

The shell ships framed as a design artefact. For production set the `chrome` prop to `full` — edge to edge, no max width, no outer radius.

In `Starter Admin.dc.html`, find `data-props` on the script tag and change the `chrome` default from `inset` to `full`.

### 3.3 Replace the mock data

Every area holds its data in `static get` blocks at the top of its logic class. They are pure data — no rendering depends on their shape beyond the keys.

| File | Static blocks | Real source |
| --- | --- | --- |
| `part-data` | `ORDERS`, `CUSTOMERS`, `COLUMNS` | `GET /orders`, `GET /customers` |
| `part-overview` | inline arrays in `renderVals` | `GET /metrics?range=` |
| `part-queue` | `ITEMS`, `SCHEDULE` | `GET /approvals`, `GET /schedule` |
| `part-chat` | `CONVERSATIONS`, `EVIDENCE` | `GET /conversations`, your LLM endpoint |
| `part-records` | `RECORD`, `LINE_ITEMS` | `GET /orders/:id` |
| `part-settings` | `MEMBERS`, `INTEGRATIONS`, `INVOICES` | `GET /team`, `GET /billing` |
| `part-states` | media and export arrays | `GET /files`, `GET /exports` |

The pattern for each:

```js
state = { rows: [], loading: true, error: null };

componentDidMount() {
  this.hostSync();
  fetch("/api/orders")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((rows) => this.setState({ rows, loading: false }))
    .catch((error) => this.setState({ error: String(error), loading: false }));
}
```

Then in `renderVals`, drive the states that already exist:

```js
isLoading: this.state.loading,
isError: !!this.state.error,
isEmpty: !this.state.loading && !this.state.error && this.state.rows.length === 0,
```

**The four data states are already built** in `part-data` — skeleton, ready, empty with a reason, error with a trace id and retry. Do not invent new ones; wire these.

### 3.4 Make writes real

Every mutation currently fires a toast and updates local state. Find them by searching for `starter:toast`. Each one needs the same treatment:

```js
approve(id) {
  const prev = this.state.items;
  this.setState({ items: prev.filter((i) => i.id !== id) });   // optimistic
  fetch("/api/approvals/" + id, { method: "POST" })
    .then((r) => { if (!r.ok) throw new Error(r.status); this.say("Approved"); })
    .catch(() => { this.setState({ items: prev }); this.say("Could not approve — restored"); });
}
```

Optimistic update, rollback on failure, and **say what happened**. The starter never shows a silent failure; keep that.

### 3.5 Authentication

`Starter Auth.dc.html` has all four magic-link states built. To make it work:

1. **Entry** — POST the email to `/api/auth/magic-link`. Always show the "sent" state, even for unknown addresses; revealing which emails exist is an account-enumeration leak.
2. **Sent** — the 30s resend cooldown is already implemented client-side. Enforce it server-side too.
3. **Verifying** — read the token from the URL, POST it to `/api/auth/verify`, set an httpOnly session cookie, redirect to the admin. The three-step walk is presentational; keep it only if verification genuinely takes a moment.
4. **Expired** — render when verify returns 410. The "request a new link" button returns to entry.

Gate the admin: if no session, redirect to the auth page. One check at the top of the host's `componentDidMount`.

### 3.6 Email templates

`Starter Emails.dc.html` holds seven templates using literal hex (mail clients strip custom properties — this is the one documented exception to the token rule).

To use them: copy the table markup for the template you need into your mail service, replace the content between the tags with your template variables, and keep the outer table structure — it is what makes them survive Outlook.

The palette is at the top of that file. If you re-skin, resolve your brand's tokens once and paste the hex values in; do not try to make emails read the skin engine.

### 3.7 Persistence and routing

- **Screen state** — the host holds `area` and `screen`. Write them to `location.hash` on change and read on load; that gives you back-button support in about ten lines.
- **Theme and skin** — persist to `localStorage` in the host's theme setter.
- **Table state** — saved views, column picker and filters live in `part-data` state. Persist per user if the tool is used daily; otherwise let them reset.

---

## 4. Path B — porting to React + Vite

The logic classes are already React class components minus `render()`. The port is mechanical.

1. **Scaffold** — `npm create vite@latest -- --template react`.
2. **Tokens** — port the skin engine to a `ThemeProvider` that sets the same custom properties on `:root`. Same nine inputs, same derivation. Do not switch to a CSS-in-JS theme object; the property names are referenced in every component.
3. **One area at a time** — copy a logic class into a `.jsx` file, add a `render()` that returns what the template expressed. `sc-for` becomes `.map()`, `sc-if` becomes `&&`, `{{ x }}` becomes `{x}`.
4. **Routing** — React Router. The area/screen pairs in the manifest map directly to routes.
5. **Data** — TanStack Query. The loading, empty and error states already exist; wire them to query status.
6. **Keep inline styles initially.** Converting to CSS modules or Tailwind at the same time as porting doubles the risk. Do it after, if at all.

Port order: shell → one simple area (`part-states`) → the table (`part-data`, hardest) → the rest.

---

## 5. Path C — Next.js

As path B, plus:

- The shell becomes a layout; areas become route segments.
- Skin resolution should happen server-side and be inlined in the document head, or the first paint flashes the wrong palette.
- Auth becomes a route handler plus middleware. The four auth states become four routes or one route with a search param.
- Email templates work well with React Email — the table structure ports directly.

---

## 6. What to keep, whatever the path

These are the parts that carry the value. Losing them turns this back into a generic dashboard.

1. **Derived colour.** Nine inputs, everything computed in oklch. The moment someone hand-picks a hover state, the system stops holding.
2. **Fixed semantic hues.** 147 green, 78 amber, 25 red. Only chroma follows the accent.
3. **The four data states, everywhere.** A table with no empty state is unfinished.
4. **Specific validation.** "Missing @" not "invalid email".
5. **Evidence behind AI output.** If a draft cannot show what it read, do not ship the draft.
6. **Mono for numerals.** Every figure, timestamp and id.
7. **Neutral for decline.** Red means broken, not smaller.
8. **Consequences before confirmation.** Destructive dialogs say what will happen, in counts.

---

## 7. Order of work

1. Serve it, set `chrome: full`, click every screen. An hour, and it tells you what you actually need.
2. Delete the areas this project will not use. Fewer files, less to port.
3. Auth — it gates everything else.
4. One area end to end with real data. Prove the pattern before repeating it.
5. The remaining areas.
6. Writes, with rollback.
7. Persistence and routing.
8. Emails last; they are independent.

---

## 8. Known gaps to plan around

- **Below 620px** the areas degrade but are not designed. A phone build needs its own pass.
- **Focus rings** are browser defaults. Keyboard navigation works; its visible state does not meet WCAG.
- **No print stylesheet.** Invoices and analytics are what people will try to print.
- **Locale is displayed, not applied.** The selector exists; number and date formatting is not wired.
- **Charts are hand-built SVG.** Fine for fixed shapes, wrong for arbitrary data — swap for a library when the data becomes dynamic.
- **The AI console is a prototype.** Evidence, confidence and drafts are authored. The interface is the deliverable, not the intelligence.
