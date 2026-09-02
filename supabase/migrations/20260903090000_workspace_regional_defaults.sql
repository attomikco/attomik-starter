-- Workspace regional and membership defaults, edited on Settings → General.
--
--   workspace_settings.time_zone            IANA zone for dates, "today", month closes
--   workspace_settings.default_member_role  the role an invitation starts on
--
-- The zone is validated against Intl in the application; the database
-- checks the shape only. The role check mirrors the assignable set
-- (owner is never a default).

alter table public.workspace_settings
  add column time_zone text not null default 'UTC'
  check (time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+\-]+)*$'),
  add column default_member_role text not null default 'member'
  check (default_member_role in ('admin', 'member', 'viewer'));

-- Both are settings fields for the audit trigger (not branding).
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
    'display_name', 'default_appearance', 'default_locale', 'time_zone', 'default_member_role',
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
