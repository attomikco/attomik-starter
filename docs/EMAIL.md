# Email

Every message this product sends is defined once, in
`src/core/email/templates.ts`, and rendered by one function. There is no
second template language, no per-module email HTML, and no separate
"preview" markup — Settings → Emails renders the catalog through the same
`renderTemplate()` the sends call, so a preview is the message.

Visual source of truth: `design-reference/Starter Emails.dc.html`.

## Layers

```
src/core/email/
  palette.ts    literal-hex light + dark email palettes (reference neutrals,
                workspace accent). No custom properties, no oklch.
  blocks.ts     the block vocabulary + escaping (esc / strong)
  render.ts     the ONE renderer: 620px table layout, inline light palette,
                dark as a prefers-color-scheme override
  text.ts       the text/plain part, derived from the same block list
  templates.ts  the catalog: one entry per email the product sends
```

`src/core/team/invitation-email.ts` is a thin adapter over the catalog, not
a template. A test asserts the two produce byte-identical output.

## Rules

1. One job per email. If it needs two buttons, it is two emails.
2. The subject carries the fact, not a tease.
3. Every button ships the same URL as plain text — corporate clients strip
   buttons. Enforced by a test.
4. Say why the recipient got it, in the footer, every time. Enforced by a
   test.
5. **Literal hex only.** Mail clients strip custom properties and many
   strip `oklch()`. Colours are resolved from the same skin at send time
   (`emailBrand()`), never copied by hand. Enforced by a test.
6. 620px, single column, 15px body; under 620px the card tightens.
7. Transactional mail carries no unsubscribe and must not pretend to.

Words come from the shell dictionary (`copy.email.*`) in every locale —
never inline strings, and never a string in a `.html` file.

## Two branding chains

| | Workspace-branded | Project-branded |
| --- | --- | --- |
| Example | invitation | sign-in link |
| Sent by | app code → Resend | Supabase Auth (GoTrue) → SMTP |
| Accent / logo | the workspace's | `projectConfig.skin`, no logo |
| Language | workspace default locale | `projectConfig.locale` |

Auth mail has no workspace: the recipient may not belong to one yet. That
is why it is a static file rather than a render, and why Settings → Emails
labels it "Project default".

## Changing an auth email

Supabase Auth sends its own mail, so it needs a static template with Go
placeholders. That file is generated — never hand-edit
`supabase/templates/*.html`:

```bash
pnpm build:auth-emails                              # regenerate from the catalog
SMTP_PASS=<resend api key> supabase config push     # ship it
```

The subject lives in the dictionary, and the script fails if
`supabase/config.toml` has drifted from the rendered subject or path. Re-run
it after changing the copy, the project skin, or `projectConfig.locale`.

## Adding an email

1. Add the words to `copy.email.<name>` in `src/core/i18n/copy.ts`, `en.ts`,
   and every other locale.
2. Add an entry to `emailTemplates` in `src/core/email/templates.ts` —
   `branding`, `delivery`, `meta`, `previewVars`, and a `build()` returning
   blocks.
3. Add the on-screen name at `settings.emails.template.<camelCaseId>` in
   `src/modules/settings/copy.ts`.

Settings → Emails picks it up with no screen changes. A
Supabase-delivered entry also needs `supabaseVars` (its Go placeholders)
and a `[auth.email.template.<id>]` block in `supabase/config.toml`.

## Settings → Emails

Owner/admin only: the route calls `notFound()` for lower ranks, and the
nav child carries `minRole: "admin"` so it is not offered. Read-only by
design — email words belong to the dictionary and email colour to the
skin, so an editor here would create a second owner for both.

The preview is an `<iframe srcDoc sandbox="">`: no scripts, no navigation,
and no styles crossing in either direction. Its light/dark toggle inlines
one palette (`forceMode`) so a reviewer sees both themes regardless of
their OS setting; sends never pass that flag.
