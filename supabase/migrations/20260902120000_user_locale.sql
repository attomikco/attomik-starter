-- Locale as a per-user setting, with a per-workspace default.
--
--   profiles.locale                 the user's own choice; null = inherit
--   workspace_settings.default_locale  new members and pre-auth screens
--
-- Locale ids are generic BCP 47 tags ("en", "es-MX"); the application
-- validates against the dictionaries it ships, the database only checks
-- the shape so adding a locale never needs a migration.

alter table public.profiles
  add column locale text
  check (locale is null or locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$');

alter table public.workspace_settings
  add column default_locale text not null default 'en'
  check (default_locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$');

-- The workspace default paints the sign-in screens before any session
-- exists, so it travels with the public auth-branding read. Return type
-- changes, so the function is recreated (grants restated).
drop function if exists public.get_auth_branding();
create function public.get_auth_branding()
returns table (
  display_name text,
  default_appearance text,
  default_locale text,
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
    s.display_name, s.default_appearance, s.default_locale,
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

-- The settings audit trigger tracks the new default as a settings field
-- (not branding). Same body as before with one more tracked key.
create or replace function private.trg_settings_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  before_j jsonb := '{}'::jsonb;
  after_j jsonb := '{}'::jsonb;
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);
  k text;
  branding_keys text[] := array['logo_light_path', 'logo_dark_path', 'favicon_path'];
  tracked text[] := array[
    'display_name', 'default_appearance', 'default_locale',
    'accent_hue', 'accent_chroma', 'neutral_hue', 'neutral_chroma', 'semantic_chroma',
    'font_family', 'mono_font_family', 'weight_bold', 'weight_semibold',
    'accent_lightness', 'accent_lightness_dark', 'accent_ink_lightness',
    'radius_large', 'radius_medium', 'radius_small',
    'logo_light_path', 'logo_dark_path', 'favicon_path'
  ];
  only_branding boolean := true;
  changed boolean := false;
begin
  foreach k in array tracked loop
    if oldj -> k is distinct from newj -> k then
      changed := true;
      before_j := before_j || jsonb_build_object(k, oldj -> k);
      after_j := after_j || jsonb_build_object(k, newj -> k);
      if not (k = any (branding_keys)) then only_branding := false; end if;
    end if;
  end loop;
  if changed then
    perform private.log_event(
      new.workspace_id,
      case when only_branding then 'workspace.branding.updated' else 'workspace.settings.updated' end,
      'workspace_settings', new.workspace_id::text, new.display_name,
      '{}'::jsonb, before_j, after_j
    );
  end if;
  return new;
end $$;
