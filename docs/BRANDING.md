# Branding / theme contract

One skin engine exists: `src/core/branding`. It is a direct port of the
`tokens()` derivation in `design-reference/Starter Admin.dc.html` (the host
copy). The reference remains the source of truth for visual behavior.

## Brand may control (SkinInput)

| Key | Meaning |
| --- | --- |
| `ah` / `ac` | accent hue and chroma |
| `nh` / `nc` | neutral hue and chroma (which way greys lean, how far) |
| `sc` | semantic chroma (intensity of green/amber/red — never their hue) |
| `font` / `mono` | display/body face and numeral face |
| `wb` / `ws` | the two emphasis weights |
| `al` / `alDark` / `ink` | optional, bright-fill accents only (e.g. Attomik green) |

Logos and favicon come later with workspace branding.

## Brand may NOT control

Radii, spacing, type sizes, layout ratios, hover/pressed behavior, disabled
greys, chart category palettes, semantic hues (147 green, 78 amber, 25 red —
fixed), dark-mode equivalents, or arbitrary component colors. Radii
(`r`/`r2`/`r3`) are `ProductGeometry` — product configuration, set per
project, never per client.

## How it works

- `resolveSkin(input, mode, geometry?)` — the ONLY derivation. Pure,
  deterministic, OKLCH. Light and dark are independent peer palettes, never
  an inversion. Inputs are clamped to the documented ranges.
- `skins` in `skins.ts` — shipped presets (`base`, `electric`, `green`),
  values extracted verbatim from the reference. `defaultSkin` is
  `skins[projectConfig.skin]` — the per-project choice in
  `src/config/project.ts` that drives first paint, the auth fallback, and
  every new workspace's bootstrap row. The canonical starter ships `base`;
  a real project may add its own preset (seeded like the others) and point
  `skin` at it, so new workspaces start branded.
- `skinStylesheet(input)` — serializes both themes into one stylesheet:
  light on `:root`, dark under `prefers-color-scheme` and
  `:root[data-theme="dark"]`. The root layout renders it server-side, so
  first paint is already correct — no theme flash.

## Seeding a skin from hex

A skin takes **two colour seeds** plus type: accent hue/chroma (`ah`/`ac`),
neutral hue/chroma (`nh`/`nc`), and semantic chroma (`sc`). There is no
dark-ground seed, no secondary colour, and no lightness scale — surfaces
and text steps sit at fixed lightness on the neutral hue, in both themes.
The one optional lightness input is the accent **fill** (`al`/`alDark`,
with `ink` for what sits on it), used when a brand's primary is not a mid
fill: `electric` states a bright fill; a dark primary states a dark one.

`seedsToSkinInput({ accent, neutral }, current)` in `seeds.ts` is the
canonical hex intake: accent → `ah`, `ac`, `al` (and `alDark`/`ink` only
when the fill is bright); neutral → `nh`, `nc`. `skinToSeeds` reverses it
for editing. `brandContrastIssues(skin)` checks the accent text pairs seeds
can break (ink on fill, accent text on card) against WCAG AA in both
themes; the Appearance screen shows its result as an amber warning.
`color.ts` holds `hexToOklch`, `normalizeHex`, and `contrastRatio`.

A preset added from a brand palette should be seeded through the same
rules and verified against the brand's supporting tones — never patched
with hardcoded overrides for individual tokens. Expect the derived accent
text and page ground to land close to a brand's secondary and light greys;
a brand's mid grey sits wherever the engine's fixed text steps put it and
is not reproduced.

## Components

Components consume CSS custom properties (`var(--card)`, `var(--accent)`,
`var(--font)` …) and never hardcode brand colors, never call `resolveSkin`
themselves, and never carry their own palettes. Red (`--bad`) means broken —
a metric that fell is neutral. Chart series `--s1`…`--s5` are rank-ordered,
not categories.

## Future Appearance page

Appearance will persist only `SkinInput`-compatible values (plus logo
uploads). The UI edits input values; it never writes resolved CSS variables.
Resolution always goes through `resolveSkin`.

## Persistence (Task 006)

Workspace branding lives in `workspace_settings` as raw SkinInput values —
column mapping in `src/core/branding/persistence.ts` (`rowToSkinInput` /
`skinInputToRow`). The `(app)` layout resolves settings server-side and
injects `skinStylesheetWithDefault(skin, default_appearance)` after the
base stylesheet, so workspace branding is correct in the initial HTML (no
flash). `default_appearance` (light default for new workspaces) is the
no-explicit-choice baseline; the user's theme toggle (`data-theme`) always
wins. Auth stays light independently. The Appearance screen edits input
values through `src/modules/settings/appearance/actions.ts` — it never
writes resolved CSS variables. Its **Custom** option takes the two hex
seeds and applies `seedsToSkinInput` to the draft; the result persists as
ordinary SkinInput columns, so a custom skin needs no extra storage. Radii (`radius_large/medium/small` →
`r/r2/r3` → `--r/--r2/--r3`, defaults 22/16/11) persist alongside brand as
**interface geometry** — editable per workspace in the Shape card, but
never part of SkinInput or the OKLCH derivation.

## Verifying

`/dev/theme?skin=base|electric|green` previews every token in both themes.
`pnpm test` locks the derivation to reference values.
