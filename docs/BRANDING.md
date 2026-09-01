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
  values extracted verbatim from the reference.
- `skinStylesheet(input)` — serializes both themes into one stylesheet:
  light on `:root`, dark under `prefers-color-scheme` and
  `:root[data-theme="dark"]`. The root layout renders it server-side, so
  first paint is already correct — no theme flash.

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

## Verifying

`/dev/theme?skin=base|electric|green` previews every token in both themes.
`pnpm test` locks the derivation to reference values.
