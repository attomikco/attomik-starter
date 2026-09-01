"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { resolveSkin, clampSkinInput, skinStylesheetWithDefault, themedDeclarations, type DefaultAppearance, type ProductGeometry, type SkinInput } from "@/core/branding"
import { useToast } from "@/ui/shell/toast-provider"
import { useSystemPrefersDark } from "@/ui/shell/theme"
import { removeBrandingAsset, saveAppearance, uploadBrandingAsset, type BrandingAssetKind } from "./actions"
import { FONT_OPTIONS, MONO_OPTIONS, PRESET_PATCHES, WEIGHT_BOLD_OPTIONS, WEIGHT_SEMI_OPTIONS } from "./options"

/**
 * Appearance & brand editor, ported from design-reference/part-settings.dc.html
 * (appearance tab). Edits apply LIVE to the whole authenticated app: the
 * draft resolves through the canonical engine into an override <style>
 * appended to <head> (beating the server-rendered sheet), then a 700ms
 * debounced, serialized autosave persists through the server action —
 * workspace_settings stays the canonical state and first render stays
 * server-first. The Shape card edits the three canonical radii —
 * interface geometry, never part of the brand SkinInput.
 */

const card: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 22 }
const cardTitle: CSSProperties = { fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 4 }
const cardSub: CSSProperties = { fontSize: 13.5, color: "var(--txt-2)", marginBottom: 18 }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }

const INTAKE: [string, string, string, string][] = [
  ["01", "One accent colour", "Their primary, as a hex or an oklch triplet. We read its hue and chroma and place every other value from there.", "e.g. #2D5BFF → hue 262, chroma .19"],
  ["02", "One neutral direction", "Warm, cool, or true neutral — a single grey from their palette is enough to infer it.", "e.g. #6B6560 reads warm"],
  ["03", "Two typefaces", "A display and body face, and a mono for numerals. If they have no mono, say so and keep ours.", "e.g. Figtree + IBM Plex Mono"],
  ["04", "Two weights", "Which weight of that face reads as bold, and which as semibold. Faces differ; the scale does not.", "e.g. 700 and 600"],
  ["05", "Logo, two files", "One for light grounds, one for dark. SVG preferred, and it has to stay legible at 30px tall.", "e.g. logo-light.svg, logo-dark.svg"],
  ["06", "Favicon", "A square mark, not the full wordmark — it renders at 16px in a browser tab and anything with words turns to mush. SVG plus a 512px PNG fallback.", "e.g. favicon.svg, icon-512.png"],
]

const RULES: [string, string][] = [
  ["surfaces", "Five steps on the neutral hue: page ground, shell, card, hairline, border. On dark they are redrawn as peers, never inverted."],
  ["text", "Four fixed lightness steps. The gap between secondary and muted is what keeps enabled and disabled apart."],
  ["accent-text", "The accent minus .08 lightness, because a fill-bright colour fails contrast at 13px."],
  ["--s1…--s5", "One hue, five steps of falling lightness and chroma. Charts use them in rank order, never as categories."],
  ["semantics", "Hues fixed at 147, 78 and 25 so green is green in every brand — only the chroma follows the accent."],
  ["hero / lead", "The emphasised panel is a tint of the accent, not a black slab, so it holds up in a pale layout."],
]

export interface AppearanceInitial {
  displayName: string
  defaultAppearance: DefaultAppearance
  skin: SkinInput
  geometry: ProductGeometry
  logoLightUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  canEdit: boolean
}

export function AppearanceEditor({ initial }: { initial: AppearanceInitial }) {
  const router = useRouter()
  const { say } = useToast()
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [appearance, setAppearance] = useState<DefaultAppearance>(initial.defaultAppearance)
  const [skin, setSkin] = useState<SkinInput>(initial.skin)
  const [geometry, setGeometry] = useState<ProductGeometry>(initial.geometry)
  const canEdit = initial.canEdit

  const patch = (p: Partial<SkinInput>) => setSkin((s) => clampSkinInput({ ...s, ...p }))

  // Draft tokens for the scoped live preview + resolved list. One engine.
  // "system" previews the OS-resolved theme, live.
  const systemDark = useSystemPrefersDark()
  const previewMode = appearance === "system" ? (systemDark ? "dark" : "light") : appearance
  const draftTokens = useMemo(() => resolveSkin(skin, previewMode, geometry), [skin, previewMode, geometry])
  const previewVars = { ...draftTokens } as CSSProperties

  // ---- Live app-wide application -----------------------------------------
  // The draft is rendered into an override <style> appended to <head>: same
  // canonical stylesheet the (app) layout emits, so the whole shell repaints
  // instantly. Removed on unmount; the server-rendered sheet (refreshed
  // after each successful save) remains the canonical first-paint source.
  useEffect(() => {
    if (!canEdit) return
    let el = document.getElementById("appearance-draft-override") as HTMLStyleElement | null
    if (!el) {
      el = document.createElement("style")
      el.id = "appearance-draft-override"
      document.head.appendChild(el)
    }
    el.textContent =
      skinStylesheetWithDefault(skin, appearance, geometry) +
      "\n" +
      themedDeclarations(
        appearance,
        "--logo-light-display: block; --logo-dark-display: none;",
        "--logo-light-display: none; --logo-dark-display: block;",
      )
  }, [skin, appearance, geometry, canEdit])
  useEffect(() => () => document.getElementById("appearance-draft-override")?.remove(), [])

  // ---- Debounced, serialized autosave ------------------------------------
  // 700ms after the last edit. Saves never overlap: an in-flight save sets
  // `pending` instead, and re-runs with the LATEST draft when it finishes —
  // so the final persisted state is always the newest edit, and older
  // responses can never clobber newer ones. Failures keep the draft applied
  // and retry on the next edit.
  type SaveStatus = "idle" | "saving" | "saved" | "error"
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const draftRef = useRef({ displayName, appearance, skin, geometry })
  draftRef.current = { displayName, appearance, skin, geometry }
  const savedRef = useRef(JSON.stringify(draftRef.current))
  const inFlight = useRef(false)
  const pending = useRef(false)

  const runSave = async () => {
    if (inFlight.current) {
      pending.current = true
      return
    }
    inFlight.current = true
    let failed = false
    do {
      pending.current = false
      const snapshot = draftRef.current
      const key = JSON.stringify(snapshot)
      if (key === savedRef.current) break
      setStatus("saving")
      const result = await saveAppearance({
        displayName: snapshot.displayName,
        defaultAppearance: snapshot.appearance,
        skin: snapshot.skin,
        geometry: snapshot.geometry,
      })
      if (!result.ok) {
        failed = true
        setStatus("error")
        setStatusMsg(result.message ?? "Couldn't save")
        break
      }
      savedRef.current = key
    } while (pending.current)
    inFlight.current = false
    if (!failed) {
      setStatus("saved")
      setStatusMsg("")
      router.refresh()
    }
  }

  useEffect(() => {
    if (!canEdit) return
    if (JSON.stringify(draftRef.current) === savedRef.current) return
    const t = setTimeout(runSave, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, appearance, skin, geometry, canEdit])

  const upload = async (kind: BrandingAssetKind, file: File | null) => {
    if (!file || !canEdit) return
    const fd = new FormData()
    fd.set("file", file)
    const result = await uploadBrandingAsset(kind, fd)
    if (!result.ok) return say(result.message ?? "Upload failed")
    say(kind === "favicon" ? "Favicon updated" : "Logo updated")
    router.refresh()
  }

  const remove = async (kind: BrandingAssetKind) => {
    if (!canEdit) return
    const result = await removeBrandingAsset(kind)
    say(result.ok ? "Removed" : result.message ?? "Could not remove")
    if (result.ok) router.refresh()
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}>Workspace · brand variables</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>Appearance & brand</h1>
          {canEdit && status !== "idle" && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em", borderRadius: 999, padding: "4px 10px", flex: "none",
              ...(status === "saving" ? { color: "var(--txt-3)", background: "var(--shell)" }
                : status === "saved" ? { color: "var(--ok)", background: "var(--ok-tint)" }
                : { color: "var(--bad)", background: "var(--bad-tint)" }) }}>
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : statusMsg || "Couldn't save"}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", margin: 0, maxWidth: 720 }}>
          The nine values a brand supplies. Everything else in the product is computed from them, in both themes.
        </p>
      </div>

      {!canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--warn-tint)", color: "var(--warn)", borderRadius: "var(--r3)", padding: "12px 16px", fontSize: 13.5, marginBottom: 14 }}>
          You can view these settings, but only an owner or admin can change them.
        </div>
      )}

      {/* Lead: what to ask a brand for (reference copy, verbatim) */}
      <div style={{ background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", borderRadius: "var(--r2)", padding: 24, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--card)", display: "grid", placeItems: "center", flex: "none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8h.01M11 12h1v5" /><circle cx="12" cy="12" r="9" /></svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>What to ask a brand for</div>
            <p style={{ fontSize: 13.5, color: "var(--txt-2)", lineHeight: 1.6, margin: "6px 0 0", maxWidth: 720 }}>
              Six things, and only six. Everything on this page — every surface, all four text steps, the chart ramp, green, amber, red, both themes — is computed from them. Asking for a full palette produces drift, because somebody eventually picks the wrong grey.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {INTAKE.map(([n, title, body, example]) => (
            <div key={n} style={{ background: "var(--card)", borderRadius: "var(--r3)", padding: 16, minWidth: 0, display: "flex", gap: 12 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", flex: "none" }}>{n}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{title}</div>
                <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.5, marginTop: 4 }}>{body}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 8 }}>{example}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, borderTop: "1px solid var(--lead-line)", paddingTop: 16 }}>
          <span style={{ ...eyebrow, flex: "none", paddingTop: 2 }}>Do not ask for</span>
          <span style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.55 }}>
            Hover and pressed states, disabled greys, chart palettes, tints, dark-mode equivalents, corner radii, spacing, or per-component colour. The system owns all of it, and a brand that insists on its own radius is asking for a different product.
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Workspace identity + default appearance */}
          <div style={card}>
            <div style={cardTitle}>Workspace</div>
            <div style={cardSub}>The name shown in the shell and browser tab, and the default appearance new sessions start in.</div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ ...eyebrow, display: "block", marginBottom: 8 }}>Display name</span>
              <span className="ui-field" style={{ display: "flex", alignItems: "center", background: "var(--card)", border: "1.5px solid var(--line-2)", borderRadius: "var(--r3)", padding: "11px 14px" }}>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!canEdit} style={{ fontSize: 14.5, width: "100%" }} />
              </span>
            </label>
            <span style={{ ...eyebrow, display: "block", marginBottom: 8 }}>Default appearance</span>
            <div style={{ display: "flex", gap: 3, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r3)", padding: 3, maxWidth: 340 }}>
              {(["light", "dark", "system"] as const).map((a) => (
                <span key={a} onClick={() => canEdit && setAppearance(a)}
                  style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase", cursor: canEdit ? "pointer" : "default", ...(appearance === a ? { background: "var(--shell)", color: "var(--txt)" } : { color: "var(--txt-4)" }) }}>
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Brand mark */}
          <div style={card}>
            <div style={cardTitle}>Brand mark</div>
            <div style={cardSub}>Drops into the rail at exactly 30px tall, up to 176px wide. Supply a horizontal lockup as SVG (or PNG at 2×, ≥ 352×60) with a transparent background and no built-in padding — a stacked or square-only mark renders tiny at this height. Supply artwork for both grounds — light and dark are peer palettes, so provide a version legible on each, not one recolored file.</div>
            <AssetRow label="Logo · light ground" hint="Shown on the light theme rail. Dark or full-color artwork that holds up on near-white." url={initial.logoLightUrl} kind="logo-light" tall canEdit={canEdit} onUpload={upload} onRemove={remove} />
            <AssetRow label="Logo · dark ground" hint="Shown on the dark theme rail. Light artwork that holds up on near-black." url={initial.logoDarkUrl} kind="logo-dark" tall dark canEdit={canEdit} onUpload={upload} onRemove={remove} />
            <AssetRow label="Favicon" hint="Square mark only. It renders at 16px, so a wordmark turns to mush." url={initial.faviconUrl} kind="favicon" canEdit={canEdit} onUpload={upload} onRemove={remove} />
          </div>

          {/* Colour */}
          <div style={card}>
            <div style={cardTitle}>Colour</div>
            <div style={cardSub}>Two hues and two chroma levels. Every surface, text step, chart step, and status colour is computed from these, in both themes.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Slider label="Accent hue" value={skin.ah} display={String(Math.round(skin.ah))} min={0} max={360} step={1} onChange={(v) => patch({ ah: v })} disabled={!canEdit}
                swatches={[250, 300, 350, 25, 78, 147].map((hu) => ({ color: `oklch(.58 .17 ${hu})`, on: Math.abs(skin.ah - hu) < 6, title: `Hue ${hu}`, pick: () => patch({ ah: hu }) }))} />
              <Slider label="Accent chroma" value={skin.ac} display={skin.ac.toFixed(3)} min={0} max={0.28} step={0.005} onChange={(v) => patch({ ac: v })} disabled={!canEdit}
                swatches={[0.04, 0.1, 0.16, 0.22].map((c) => ({ color: `oklch(.58 ${c} ${skin.ah})`, on: Math.abs(skin.ac - c) < 0.02, title: `Chroma ${c}`, pick: () => patch({ ac: c }) }))} />
              <Slider label="Neutral hue" value={skin.nh} display={String(Math.round(skin.nh))} min={0} max={360} step={1} onChange={(v) => patch({ nh: v })} disabled={!canEdit}
                swatches={[250, 285, 140, 70, 30, 0].map((hu) => ({ color: `oklch(.80 .02 ${hu})`, dark: true, on: Math.abs(skin.nh - hu) < 6, title: `Neutral hue ${hu}`, pick: () => patch({ nh: hu }) }))} />
              <Slider label="Neutral chroma" value={skin.nc} display={skin.nc.toFixed(3)} min={0} max={0.02} step={0.001} onChange={(v) => patch({ nc: v })} disabled={!canEdit}
                swatches={[0, 0.006, 0.012, 0.018].map((c) => ({ color: `oklch(.86 ${c} ${skin.nh})`, dark: true, on: Math.abs(skin.nc - c) < 0.002, title: `Neutral chroma ${c}`, pick: () => patch({ nc: c }) }))} />
              <Slider label="Semantic chroma" value={skin.sc} display={skin.sc.toFixed(3)} min={0.06} max={0.24} step={0.005} onChange={(v) => patch({ sc: v })} disabled={!canEdit}
                hint="Controls the intensity of success, warning, and error colours. Their hues stay fixed."
                preview={
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }} aria-hidden>
                    {([["Success", "--ok-fill"], ["Warning", "--warn-fill"], ["Error", "--bad-fill"]] as const).map(([name, token]) => (
                      <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, display: "block", border: "1px solid var(--line)", background: draftTokens[token] }} />
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--txt-3)" }}>{name}</span>
                      </span>
                    ))}
                  </div>
                } />
            </div>
          </div>

          {/* Type */}
          <div style={card}>
            <div style={cardTitle}>Type</div>
            <div style={cardSub}>Sizes and tracking are fixed by the system. A brand supplies the faces and the two emphasis weights.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <Picker label="Display and body" value={skin.font} options={FONT_OPTIONS} face disabled={!canEdit} onPick={(v) => patch({ font: v as string })} />
              <Picker label="Mono" value={skin.mono} options={MONO_OPTIONS} face mono disabled={!canEdit} onPick={(v) => patch({ mono: v as string })} />
              <Picker label="Bold weight" value={skin.wb} options={WEIGHT_BOLD_OPTIONS} disabled={!canEdit} onPick={(v) => patch({ wb: v as number })} />
              <Picker label="Semibold weight" value={skin.ws} options={WEIGHT_SEMI_OPTIONS} disabled={!canEdit} onPick={(v) => patch({ ws: v as number })} />
            </div>
          </div>
          {/* Shape — interface geometry, ported from the reference; NOT brand */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={cardTitle}>Shape</div>
              <span style={{ ...eyebrow, color: "var(--txt-4)" }}>Interface setting</span>
            </div>
            <div style={cardSub}>Three radii: outer panels, inner panels, controls. Changing these changes the product, not the brand — move them deliberately.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
              {([["--r", "r", geometry.r], ["--r2", "r2", geometry.r2], ["--r3", "r3", geometry.r3]] as const).map(([token, key, value]) => (
                <div key={token} style={{ minWidth: 0 }}>
                  <div style={{ height: 54, background: "var(--card)", border: "1px solid var(--line)", borderRadius: value }} />
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0 8px" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-2)", flex: 1 }}>{token}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{value}px</span>
                  </div>
                  <input type="range" min={0} max={34} step={1} value={value} disabled={!canEdit}
                    onChange={(e) => setGeometry((g) => ({ ...g, [key]: parseInt(e.target.value, 10) }))}
                    style={{ width: "100%", accentColor: "var(--accent)", cursor: canEdit ? "pointer" : "default" }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Live preview — draft tokens scoped to this panel */}
          <div style={{ ...previewVars, background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", borderRadius: "var(--r2)", padding: 22, fontFamily: "var(--font)", color: "var(--txt)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--accent-text)", marginBottom: 16 }}>Live preview</div>
            <div style={{ fontSize: 30, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1 }}>$248,310</div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ok)", background: "var(--ok-tint)", borderRadius: 999, padding: "4px 9px" }}>↑ 18.4%</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-2)" }}>vs $209,720</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56, marginTop: 20 }}>
              {[46, 30, 52, 38, 56, 24].map((h, i) => (
                <span key={i} style={{ flex: 1, display: "block", borderRadius: "3px 3px 0 0", height: h, background: `var(--s${Math.min(5, i + 1)})` }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 20, flexWrap: "wrap" }}>
              <span style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "10px 18px", fontSize: 13.5, fontWeight: "var(--w-semi)" as never }}>Primary</span>
              <span style={{ border: "1px solid var(--line-2)", color: "var(--txt-2)", borderRadius: 999, padding: "9px 17px", fontSize: 13.5, fontWeight: "var(--w-semi)" as never }}>Secondary</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {([["Settled", "ok"], ["Waiting", "warn"], ["Failed", "bad"]] as const).map(([label, tone]) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 11, color: `var(--${tone})`, background: `var(--${tone}-tint)`, borderRadius: 999, padding: "4px 10px" }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: `var(--${tone}-fill)`, display: "block" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 14 }}>Presets</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRESET_PATCHES.map((p) => {
                const on = Math.abs(skin.ah - p.patch.ah) < 4 && Math.abs(skin.ac - p.patch.ac) < 0.03 && p.patch.font === skin.font
                return (
                  <div key={p.label} onClick={() => canEdit && setSkin(clampSkinInput({ ...skin, ...p.patch, ink: p.patch.ink } as SkinInput))}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r3)", cursor: canEdit ? "pointer" : "default", boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}` }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, flex: "none", display: "block", background: p.dot }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{p.label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)" }}>{p.hint}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Derivation rules */}
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 6 }}>How the rest is derived</div>
            <p style={{ fontSize: 12.5, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 14px" }}>
              Colour is built in oklch, where the first number is perceived lightness. That is what lets one rule hold for every hue instead of being eyeballed per brand.
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {RULES.map(([token, rule], i) => (
                <div key={token} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: i < RULES.length - 1 ? "1px solid var(--line)" : undefined }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", width: 84, flex: "none" }}>{token}</span>
                  <span style={{ fontSize: 12.5, color: "var(--txt-2)", flex: 1, minWidth: 0, lineHeight: 1.45 }}>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolved tokens (from the draft, via the canonical engine) */}
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Resolved tokens</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {["--accent", "--accent-text", "--bg", "--card", "--line-2", "--ok", "--warn", "--bad"].map((n) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, flex: "none", display: "block", border: "1px solid var(--line)", background: draftTokens[n] }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt-2)", width: 92, flex: "none" }}>{n}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draftTokens[n]}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <span className="sh-pick" title="Restores the last successfully saved values (not the starter defaults)"
                onClick={() => {
                  if (!canEdit) return
                  const saved = JSON.parse(savedRef.current) as typeof draftRef.current
                  setDisplayName(saved.displayName)
                  setAppearance(saved.appearance)
                  setSkin(saved.skin)
                  setGeometry(saved.geometry)
                }}
                style={{ fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "9px 16px", cursor: canEdit ? "pointer" : "default" }}>
                Reset to last saved
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function Slider({ label, value, display, min, max, step, onChange, swatches, preview, hint, disabled }: {
  label: string; value: number; display: string; min: number; max: number; step: number
  onChange: (v: number) => void
  swatches?: { color: string; on: boolean; title: string; pick: () => void; dark?: boolean }[]
  preview?: React.ReactNode
  hint?: string
  disabled: boolean
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <span style={{ ...eyebrow, flex: 1 }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt)" }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: disabled ? "default" : "pointer" }} />
      {swatches && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          {swatches.map((w) => (
            <span key={w.title} title={w.title} onClick={() => !disabled && w.pick()}
              style={{ width: 24, height: 24, borderRadius: 7, cursor: disabled ? "default" : "pointer", display: "grid", placeItems: "center", fontSize: 11, boxSizing: "border-box", color: w.dark ? "var(--txt)" : "#fff", background: w.color, ...(w.on ? { outline: "2px solid var(--txt)", outlineOffset: 2, border: "1px solid rgba(255,255,255,.55)" } : { border: "1px solid var(--line)", opacity: 0.78 }) }}>
              {w.on ? "✓" : ""}
            </span>
          ))}
        </div>
      )}
      {preview && <div style={{ marginTop: 10 }}>{preview}</div>}
      {hint && <div style={{ fontSize: 12, color: "var(--txt-3)", marginTop: 8, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  )
}

function Picker({ label, value, options, face, mono, disabled, onPick }: {
  label: string; value: string | number; options: readonly (string | number)[]
  face?: boolean; mono?: boolean; disabled: boolean
  onPick: (v: string | number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ minWidth: 0, position: "relative" }}>
      <span style={{ ...eyebrow, display: "block", marginBottom: 8 }}>{label}</span>
      <span onClick={() => !disabled && setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "var(--card)", border: `1.5px solid ${open ? "var(--accent)" : "var(--line-2)"}`, borderRadius: "var(--r3)", padding: "11.5px 13.5px", fontSize: 14, cursor: disabled ? "default" : "pointer", boxSizing: "border-box" }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...(face ? { fontFamily: mono ? `'${value}', ui-monospace, monospace` : `'${value}', system-ui, sans-serif`, fontSize: 15 } : { fontFamily: "var(--mono)", fontSize: 13.5 }) }}>{String(value)}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt-4)", flex: "none", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .12s" }}>▾</span>
      </span>
      {open && (
        <div className="sh-scroll" style={{ position: "absolute", top: 76, left: 0, right: 0, zIndex: 40, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)", boxShadow: "0 18px 40px rgba(0,0,0,.16)", padding: 6, maxHeight: 268, animation: "sh-rise .12s ease-out" }}>
          {options.map((o) => (
            <div key={String(o)} className="sh-row-hover" onClick={() => { setOpen(false); onPick(o) }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 8, cursor: "pointer", color: o === value ? "var(--txt)" : "var(--txt-2)" }}>
              <span style={face ? { fontFamily: mono ? `'${o}', ui-monospace, monospace` : `'${o}', system-ui, sans-serif`, fontSize: 15, letterSpacing: "-0.01em" } : { fontFamily: "var(--mono)", fontSize: 13.5 }}>{String(o)}</span>
              {o === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginLeft: "auto" }}><path d="m5 13 5 5L20 7" /></svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AssetRow({ label, hint, url, kind, tall, dark, canEdit, onUpload, onRemove }: {
  label: string; hint: string; url: string | null; kind: BrandingAssetKind
  tall?: boolean; dark?: boolean; canEdit: boolean
  onUpload: (kind: BrandingAssetKind, file: File | null) => void
  onRemove: (kind: BrandingAssetKind) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ minWidth: tall ? 152 : 46, height: tall ? 56 : 46, borderRadius: tall ? "var(--r3)" : 10, background: dark ? "oklch(0.2 0 0)" : "var(--card)", border: `1px ${url ? "solid var(--line)" : "dashed var(--line-2)"}`, display: "grid", placeItems: "center", padding: tall ? "0 14px" : 0, boxSizing: "border-box" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} preview`} style={tall ? { maxHeight: 34, maxWidth: 148, display: "block", objectFit: "contain" } : { width: 22, height: 22, display: "block", objectFit: "contain" }} />
        ) : (
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--txt-4)" }}>{kind === "favicon" ? "ico" : "none"}</span>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{label}</div>
        <div style={{ fontSize: 12.5, color: "var(--txt-2)", lineHeight: 1.5, marginTop: 3 }}>{hint}</div>
      </div>
      {canEdit && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "10px 16px", cursor: "pointer", flex: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
          Upload
          <input type="file" accept="image/*" onChange={(e) => onUpload(kind, e.target.files?.[0] ?? null)} style={{ display: "none" }} />
        </label>
      )}
      {canEdit && url && (
        <span onClick={() => onRemove(kind)} style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", cursor: "pointer", flex: "none" }}>Remove</span>
      )}
    </div>
  )
}
