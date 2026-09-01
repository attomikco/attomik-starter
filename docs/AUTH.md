# Authentication

Magic-link auth via Supabase, using only the canonical infrastructure
(`src/core/supabase/*`). The visual states are ported from
`design-reference/Starter Auth.dc.html` — that file remains the source of
truth for the auth surface.

## Flow

```
/login (Entry) → requestMagicLink server action → signInWithOtp
  → Sent state (30s resend cooldown; Supabase enforces 60s server-side)
email link → /auth/callback?next=…
  → verifyOtp (token_hash+type) or exchangeCodeForSession (code)
  → success: redirect to next   → failure: /expired
```

The Sent state renders identically whether or not the address exists —
never reveal account existence. `/verify` is the ported Verifying state
(presentational, per the reference's own guidance — the server exchange is
instant). `/expired` handles expired/invalid/used links.

## Route protection

Two layers, both using verified server identity (`getClaims()` — never
`getSession()` or browser state):

1. `src/core/supabase/proxy.ts` — signed-out requests to non-public paths
   redirect to `/login?next=<path>`. Public: `/login`, `/verify`,
   `/expired`, `/auth/*`, `/api/health/*`, `/dev/theme`.
2. `src/app/(app)/layout.tsx` — `requireUser()` guard (Server Function
   calls can bypass the proxy; the layout always holds).

Order: authentication → module availability (`requireModule`) → content.
An authenticated hit on a disabled module still 404s.

## Redirect-back

`sanitizeNextPath()` (`src/core/auth/redirects.ts`) allows only local app
paths — no external URLs, `//`, backslashes, schemes, or auth-loop targets.
Applied in the proxy, the magic-link action, and the callback.

## Logout

Account menu → `signOut()` server action → Supabase `signOut()` → cookies
cleared → redirect `/login`.

## Canonical helpers (`src/core/auth/`)

`getCurrentUser()` / `requireUser()` · `requestMagicLink()` / `signOut()`
actions · `validateEmail()` / `emailInitials()` · `sanitizeNextPath()`.
Modules never call Supabase auth directly.

## Account display

The shell shows the verified email (local part + full address) and initials
derived from it. No profile data exists yet — profiles/workspaces and real
authorization arrive in Task 006 and are separate from authentication.

## Email delivery

Supabase Auth sends its emails through **Resend SMTP** (sender
`auth@email.attomik.co`, name "Attomik Starter"). Supabase's default shared
sender (`noreply@mail.app.supabase.io`) is development-only — hard-capped
at 2 auth emails/hour with weak deliverability — and must not be relied on.

Auth configuration is code: `supabase/config.toml` (SMTP, `email_sent`
rate limit 100/hour, OTP expiry 900s, redirect URLs), applied with:

```bash
SMTP_PASS=<resend api key> supabase config push
```

The SMTP password is a sending-only Resend API key referenced via `env()` —
it lives in Supabase project config and is never committed. Rate-limit
failures (429 / `over_email_send_rate_limit`) are surfaced to the user with
a generic "Too many sign-in requests" message — that reveals nothing about
account existence; every other failure still renders the identical Sent
state. Custom React Email auth templates (from `Starter Emails.dc.html`)
via a send-email hook are a later task.

## Auth-surface branding

The sign-in screens render the WORKSPACE identity server-first (skin,
radii, logo, name, favicon) via the `get_auth_branding()` RPC — an
INTENTIONALLY PUBLIC, hardened SECURITY DEFINER function (STABLE, pinned
empty search_path) that exposes only branding columns for the
deployment's earliest workspace. This is a deliberate, accepted advisor
finding: everything it returns paints the public /login page anyway, and
the logo files already live in the public branding bucket. The ground
follows the workspace default appearance ("system" renders light — the
server cannot know the visitor's OS preference without a flash); a fresh
deployment with no workspace falls back to the neutral starter identity.

## New-project setup checklist

Every project cloned from this starter must do this once:

1. Create the Supabase project; put its URL + publishable key in `.env.local`.
2. Verify the sending domain in Resend (or reuse a verified one).
3. Create a **sending-only** Resend API key restricted to that domain.
4. Set `project_id`, sender address/name, and redirect URLs in
   `supabase/config.toml`; run `supabase link`, then
   `SMTP_PASS=<key> supabase config push`.
5. Confirm the pushed config: auth email limit (~100/hour), OTP expiry
   900s, `site_url` + `additional_redirect_urls` for every environment.
