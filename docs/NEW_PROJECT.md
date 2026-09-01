# Starting a new project from Attomik Starter

Follow in order; each step ends with a check.

1. **Create the repo** from this template; `pnpm install`.
   ✓ `pnpm build` passes.
2. **Rename the app**: `src/config/project.ts` → `name` (this is the
   workspace name and browser title until Appearance is configured).
   ✓ Grep for "Attomik Starter" outside docs if the project must not show it.
3. **Create the Supabase project** (dashboard or MCP). Copy the URL and
   publishable key into `.env.local` (from `.env.example`).
   ✓ `GET /api/health/supabase` returns `{"ok":true}` in `pnpm dev`.
4. **Apply core migrations**: `supabase link --project-ref <ref>` then
   apply everything in `supabase/migrations/` (CLI `db push`, or the
   Supabase MCP `apply_migration` per file, in filename order).
   ✓ Tables exist; advisors show no RLS-disabled errors.
5. **Configure auth as code**: edit `supabase/config.toml` — `project_id`,
   `site_url`, `additional_redirect_urls` (localhost + your domains),
   sender name/address.
6. **Resend SMTP**: verify your sending domain in Resend; create a
   sending-only API key restricted to it; run
   `SMTP_PASS=<key> supabase config push`.
   Put a second sending-only key in `.env.local` as `RESEND_API_KEY` with
   `APP_EMAIL_FROM` for invitation email.
   ✓ Request a magic link; it arrives from YOUR sender, not
   `noreply@mail.app.supabase.io`.
7. **Bootstrap login**: sign in with your own address.
   ✓ You land on Overview; Settings → Team shows you as owner.
8. **Configure Appearance**: accent, fonts, logos, default appearance.
   ✓ Reload — branding renders on first paint.
9. **Enable modules** the product needs (`project.ts` + docs/MODULES.md,
   applying each enabled module's migrations from `supabase/modules/`).
   ✓ Disabled modules appear nowhere; their routes 404.
10. **Invite the team** from Settings → Team.
    ✓ Invitation email arrives; acceptance joins the right workspace.
11. **Deploy** — follow docs/DEPLOYMENT.md.
