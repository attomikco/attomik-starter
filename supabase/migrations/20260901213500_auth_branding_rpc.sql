-- Auth-surface branding: the sign-in screens render before any session
-- exists, so they need a deliberate public read of the workspace's brand
-- values — exactly the values that paint the public /login page (colors,
-- typography, radii, logos from the already-public branding bucket, and
-- the workspace display name). Nothing else is exposed: only branding
-- columns, only for the deployment's single (earliest) workspace, and no
-- ids or timestamps.
--
-- SECURITY DEFINER by necessity (workspace_settings is member-only under
-- RLS), hardened like the invitation RPCs: STABLE, pinned empty
-- search_path, single indexed read. The anon grant is INTENTIONAL and an
-- accepted advisor finding — see docs/AUTH.md.
create or replace function public.get_auth_branding()
returns table (
  display_name text,
  default_appearance text,
  logo_light_path text,
  logo_dark_path text,
  favicon_path text,
  accent_hue numeric,
  accent_chroma numeric,
  neutral_hue numeric,
  neutral_chroma numeric,
  semantic_chroma numeric,
  font_family text,
  mono_font_family text,
  weight_bold integer,
  weight_semibold integer,
  accent_lightness numeric,
  accent_lightness_dark numeric,
  accent_ink_lightness numeric,
  radius_large integer,
  radius_medium integer,
  radius_small integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.display_name, s.default_appearance,
    s.logo_light_path, s.logo_dark_path, s.favicon_path,
    s.accent_hue, s.accent_chroma, s.neutral_hue, s.neutral_chroma,
    s.semantic_chroma, s.font_family, s.mono_font_family,
    s.weight_bold, s.weight_semibold,
    s.accent_lightness, s.accent_lightness_dark, s.accent_ink_lightness,
    s.radius_large, s.radius_medium, s.radius_small
  from public.workspace_settings s
  join public.workspaces w on w.id = s.workspace_id
  order by w.created_at asc
  limit 1
$$;

revoke all on function public.get_auth_branding() from public;
grant execute on function public.get_auth_branding() to anon, authenticated;
