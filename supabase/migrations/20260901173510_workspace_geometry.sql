-- Task 006.2: persist interface geometry (radii) per workspace. These are
-- ProductGeometry values — deliberately NOT part of the brand SkinInput or
-- the OKLCH derivation. Mapping (src/core/branding/persistence.ts):
--   radius_large → r (--r, outer panels, default 22)
--   radius_medium → r2 (--r2, inner panels, default 16)
--   radius_small → r3 (--r3, controls, default 11)

alter table public.workspace_settings
  add column radius_large integer not null default 22
    check (radius_large between 0 and 34),
  add column radius_medium integer not null default 16
    check (radius_medium between 0 and 34),
  add column radius_small integer not null default 11
    check (radius_small between 0 and 34);
