# Production deployment (Vercel)

## Vercel project

- Framework auto-detects Next.js; build `pnpm build`; no custom output.
- Environment variables (Production + Preview):
  - `NEXT_PUBLIC_SUPABASE_URL` (client-safe)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client-safe)
  - `RESEND_API_KEY` (server-only, sending-only key)
  - `APP_EMAIL_FROM` (server-only)
  Never add a service-role key — the app does not use one.

## Supabase production config

- `supabase/config.toml`: set `site_url` to the production URL and include
  it (plus preview domains if desired) in `additional_redirect_urls`; then
  `SMTP_PASS=<resend key> supabase config push`.
- Migrations: apply everything in `supabase/migrations/` to the production
  project before first deploy.

## Email

- Sending domain verified in Resend (SPF/DKIM green).
- Supabase Auth SMTP uses a Resend sending-only key (config push).
- The app's invitation sender (`APP_EMAIL_FROM`) is on the same domain.

## Post-deploy verification

1. `https://<domain>/api/health/supabase` → `{"ok":true}` (generic,
   credential-free health check — intentionally available in production).
2. Signed-out `/` redirects to `/login`; magic link arrives from your
   sender; callback lands in the app; reload keeps the session.
3. Appearance branding renders in the first HTML response (view source:
   the skin variables are present — no default-skin flash).
4. RLS spot-check: a second (non-member) account sees no workspace data,
   and `/settings/team` actions respect roles.
5. `/dev/theme`, `/dev/shell`, `/dev/data`, `/dev/auth` all return 404.

## Domains

Point your Vercel domain, then add it to `additional_redirect_urls` and
`site_url`, and re-push the Supabase config. No client domain is
hardcoded anywhere in the repo.
