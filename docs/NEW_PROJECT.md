# Starting a new project from Attomik Starter

One developer should be able to go from nothing to a signed-in, branded
workspace by following this page top to bottom. Linked docs carry the
deeper explanations; the complete happy path lives here.

The starter uses **pnpm** (pinned via `packageManager` in `package.json`).
Never commit a `package-lock.json`.

## 1. Get the code

**Fresh repository** — copy the starter without its history:

```sh
pnpm dlx degit attomikco/attomik-starter my-app
cd my-app
git init
git add -A && git commit -m "chore: import Attomik Starter"
pnpm install
```

**Directory that already contains `.git`** — you created the destination
repo first (empty on the remote) and cloned it locally:

```sh
cd my-app                                        # contains .git, nothing else
pnpm dlx degit attomikco/attomik-starter . --force
git add -A && git commit -m "chore: import Attomik Starter"
pnpm install
```

`--force` is required because degit refuses a non-empty directory — the
`.git` folder counts as content. It copies the starter's files and leaves
your `.git` untouched.

✓ `pnpm build` passes.

## 2. First login checklist

Follow in order; each step ends with a check.

1. **Rename the app**: `src/config/project.ts` → `name`. This is the
   workspace name and browser title until Appearance is configured.
   ✓ Grep for "Attomik Starter" outside docs if the project must not show it.

2. **Create the Supabase project** (dashboard or MCP). Note the project
   ref (the subdomain of the project URL).

3. **Environment**: `cp .env.example .env.local`, then fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — the project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the current
     `sb_publishable_...` key from Settings → API Keys (not the legacy
     "anon" JWT; the starter expects the new key format)

   `.env.local` is git-ignored — real values never get committed.

4. **Link the Supabase CLI** and point config at your project:
   ```sh
   supabase link --project-ref <ref>
   ```
   Set `project_id` in `supabase/config.toml` to the same ref (the value
   in the repo is the canonical starter's own dev project).

5. **Apply core migrations** — everything in `supabase/migrations/`:
   ```sh
   supabase db push
   ```
   (or the Supabase MCP `apply_migration` per file, in filename order).
   ✓ Tables exist; advisors show no RLS-disabled errors.

6. **Resend credentials**: verify the project's sending domain in Resend,
   then create **two sending-only API keys** restricted to it:
   - one for Supabase auth email (used in the next step, never stored)
   - one in `.env.local` as `RESEND_API_KEY`, with `APP_EMAIL_FROM` set to
     the sender for invitation email (e.g. `App <auth@mail.yourdomain>`)

   Update `admin_email` / `sender_name` in `supabase/config.toml` to the
   project's identity. Details: docs/AUTH.md.

7. **Push auth config as code** (SMTP password passed at push time only):
   ```sh
   SMTP_PASS=<auth-sending-key> supabase config push
   ```
   The committed config already allows local login — `site_url` is
   `http://localhost:3000` out of the box. Production URLs are added at
   deployment (docs/DEPLOYMENT.md), never committed here.

8. **Start the app**: `pnpm dev`.
   ✓ `GET http://localhost:3000/api/health/supabase` returns `{"ok":true}`.

9. **Request a magic link** at `/login` with your own address.
   ✓ The email arrives from YOUR sender, not
   `noreply@mail.app.supabase.io`. (Check spam the first time.)

10. **Verify workspace bootstrap**: open the link.
    ✓ You land on Overview; Settings → Team shows you as owner;
    Settings → Activity shows the workspace-created event.

## 3. After first login

- **Appearance**: Settings → Appearance — accent, fonts, logos, radii,
  default theme. ✓ Reload: branding renders on first paint (docs/BRANDING.md).
- **Modules**: enable flags in `src/config/project.ts`, then install each
  enabled module's backend with `pnpm enable-module <id>` and apply the
  staged migrations (docs/MODULES.md).
  ✓ Disabled modules appear nowhere; their routes 404.
- **Team**: invite from Settings → Team. ✓ Invitation email arrives and
  acceptance joins the right workspace (docs/TEAM.md).
- **Deploy**: docs/DEPLOYMENT.md.

## 4. Localhost troubleshooting

### HTTP 431 during auth

Every Supabase project you sign in to on `localhost` sets its own chunked
auth cookies, and they all share the one `localhost` cookie jar. After a
few local projects the combined headers can exceed the server's limit and
requests fail with **431 Request Header Fields Too Large** (or auth
behaves erratically).

Recovery:

- clear cookies/site data for `localhost`, or
- use a clean browser profile / incognito window.

Prevention: give active local projects distinct dev ports so their
cookies stay isolated. The canonical starter stays on 3000; a cloned
project may intentionally change its `dev` script:

| Project | Port |
| --- | --- |
| Project A | 3000 |
| Project B | 3010 |
| Project C | 3020 |

(Keep `site_url`/redirects and the health-check URL in sync with the port
you choose.)

### "Something went wrong" on the very first page load after login

First sign-in bootstraps the workspace, and that first load may resolve it
from several concurrent requests. The bootstrap is race-safe in the
current starter (concurrent racers converge on one workspace, one owner
membership, one settings row — see docs/WORKSPACES.md), so this should
not happen. If a project cloned from an older starter shows a fatal
"could not start this page" screen once after the magic-link callback and
works on reload, it is missing the race-safe bootstrap — port
`src/core/workspace/bootstrap.ts` and `src/app/error.tsx` from the
current starter.

## 5. The first Claude Code prompt

Paste this as the first prompt when starting product work on the clone:

```
Read, in this order: CLAUDE.md, README.md, docs/ARCHITECTURE.md,
docs/MODULES.md, and the detailed docs relevant to what follows
(DATA, TEAM, AUDIT, BRANDING, AUTH, SUPABASE, SHELL). Review
design-reference/ — it is the read-only visual source of truth.

Then, before writing any code, analyze the product we are building:
<describe the product here>

Produce:
- the domain model (entities and relationships)
- the project-specific modules we need, and what each owns
- which starter primitives each screen reuses (DataTable, forms,
  records, shell) — nothing custom where a canonical primitive exists
- the database tables, workspace-scoped with RLS, plus audit events
- the permission matrix per role
- the routes/screens per module
- an implementation sequence in small verifiable steps

Do not modify core architecture (src/core, src/ui, the module registry
pattern, auth, workspace, or audit foundations) merely because this
product is different — extend through the documented module contract.
```
