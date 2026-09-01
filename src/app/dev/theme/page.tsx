import type { CSSProperties } from "react"
import { requireDevelopment } from "@/core/dev"
import { resolveSkin, skins, type SkinPresetId, type ThemeMode } from "@/core/branding"

/**
 * Development-only token preview. Renders each theme's resolved variables
 * side by side, per preset, to compare against the design reference.
 * Not a product screen — intentionally unstyled beyond the tokens themselves.
 */

const SWATCHES: [label: string, background: string, border?: string][] = [
  ["bg", "--bg"],
  ["shell", "--shell"],
  ["card", "--card", "--line"],
  ["line", "--line"],
  ["line-2", "--line-2"],
  ["accent", "--accent"],
  ["accent-tint", "--accent-tint"],
  ["lead", "--lead", "--lead-line"],
  ["ok-fill", "--ok-fill"],
  ["ok-tint", "--ok-tint"],
  ["warn-fill", "--warn-fill"],
  ["warn-tint", "--warn-tint"],
  ["bad-fill", "--bad-fill"],
  ["bad-tint", "--bad-tint"],
  ["s1", "--s1"],
  ["s2", "--s2"],
  ["s3", "--s3"],
  ["s4", "--s4"],
  ["s5", "--s5"],
]

function ThemePanel({ preset, mode }: { preset: SkinPresetId; mode: ThemeMode }) {
  const tokens = resolveSkin(skins[preset], mode)
  const style = { ...tokens, background: tokens["--bg"], color: tokens["--txt"], fontFamily: tokens["--font"], padding: 20, flex: 1, minWidth: 320 } as CSSProperties

  return (
    <section style={style}>
      <h2 style={{ fontWeight: Number(tokens["--w-bold"]), margin: "0 0 12px" }}>
        {preset} · {mode}
      </h2>

      <p style={{ color: "var(--txt)", margin: 4 }}>txt — primary text</p>
      <p style={{ color: "var(--txt-2)", margin: 4 }}>txt-2 — secondary text</p>
      <p style={{ color: "var(--txt-3)", margin: 4 }}>txt-3 — subtle text</p>
      <p style={{ color: "var(--txt-4)", margin: 4 }}>txt-4 — faint text</p>
      <p style={{ color: "var(--accent-text)", margin: 4, fontWeight: Number(tokens["--w-semi"]) }}>
        accent-text
      </p>
      <p style={{ color: "var(--ok)", margin: 4 }}>ok — success text</p>
      <p style={{ color: "var(--warn)", margin: 4 }}>warn — warning text</p>
      <p style={{ color: "var(--bad)", margin: 4 }}>bad — error text</p>
      <p style={{ fontFamily: "var(--mono)", margin: 4 }}>mono 0123456789 12:45 #A18C</p>

      <div style={{ background: "var(--accent)", color: "var(--accent-ink)", padding: "8px 14px", borderRadius: "var(--r3)", display: "inline-block", fontWeight: Number(tokens["--w-semi"]), margin: "8px 0" }}>
        accent fill + ink
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {SWATCHES.map(([label, bg, border]) => (
          <div key={label} style={{ width: 86 }}>
            <div
              style={{
                height: 40,
                background: `var(${bg})`,
                border: `1px solid var(${border ?? "--line-2"})`,
                borderRadius: "var(--r3)",
              }}
            />
            <div style={{ fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function ThemePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ skin?: string }>
}) {
  requireDevelopment()
  const { skin } = await searchParams
  const presetIds = Object.keys(skins) as SkinPresetId[]
  const active: SkinPresetId = presetIds.includes(skin as SkinPresetId)
    ? (skin as SkinPresetId)
    : "base"

  return (
    <main style={{ fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ padding: 12, display: "flex", gap: 12 }}>
        {presetIds.map((id) => (
          <a key={id} href={`/dev/theme?skin=${id}`} style={{ fontWeight: id === active ? 700 : 400 }}>
            {id}
          </a>
        ))}
      </nav>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <ThemePanel preset={active} mode="light" />
        <ThemePanel preset={active} mode="dark" />
      </div>
    </main>
  )
}
