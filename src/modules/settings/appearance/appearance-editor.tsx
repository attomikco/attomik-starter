"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { resolveSkin, clampSkinInput, skinStylesheetWithDefault, themedDeclarations, brandContrastIssues, normalizeHex, seedsToSkinInput, skinToSeeds, type DefaultAppearance, type ProductGeometry, type SkinInput, type SkinSeeds } from "@/core/branding"
import { useToast } from "@/ui/shell/toast-provider"
import { useT } from "@/core/i18n/client"
import type { Translator } from "@/core/i18n"
import { settingsCopy } from "../copy"
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

const intake = (t: Translator): [string, string, string, string][] =>
  ["1", "2", "3", "4", "5", "6"].map((n) => [`0${n}`, t(`settings.appearance.intake.${n}.title`), t(`settings.appearance.intake.${n}.body`), t(`settings.appearance.intake.${n}.example`)])

const rules = (t: Translator): [string, string][] => [
  ["surfaces", t("settings.appearance.rule.surfaces")],
  ["text", t("settings.appearance.rule.text")],
  ["accent-text", t("settings.appearance.rule.accentText")],
  ["--s1…--s5", t("settings.appearance.rule.series")],
  ["semantics", t("settings.appearance.rule.semantics")],
  ["hero / lead", t("settings.appearance.rule.lead")],
]

export interface AppearanceInitial {
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
  const t = useT(settingsCopy)
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
  // Both grounds, always: light and dark are peer palettes, so the preview
  // shows each from the same engine instead of following one appearance.
  const lightPreview = useMemo(() => resolveSkin(skin, "light", geometry) as CSSProperties, [skin, geometry])
  const darkPreview = useMemo(() => resolveSkin(skin, "dark", geometry) as CSSProperties, [skin, geometry])
  // Accent pairs the seeds can break, both themes, WCAG AA. Amber, not red:
  // a failing draft is a warning to act on, nothing is broken yet.
  const contrastIssues = useMemo(() => brandContrastIssues(skin), [skin])

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
  const draftRef = useRef({ appearance, skin, geometry })
  draftRef.current = { appearance, skin, geometry }
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
  }, [appearance, skin, geometry, canEdit])

  const upload = async (kind: BrandingAssetKind, file: File | null) => {
    if (!file || !canEdit) return
    const fd = new FormData()
    fd.set("file", file)
    const result = await uploadBrandingAsset(kind, fd)
    if (!result.ok) return say(result.message ?? t("settings.appearance.toast.uploadFailed"))
    say(kind === "favicon" ? t("settings.appearance.toast.faviconUpdated") : t("settings.appearance.toast.logoUpdated"))
    router.refresh()
  }

  const remove = async (kind: BrandingAssetKind) => {
    if (!canEdit) return
    const result = await removeBrandingAsset(kind)
    say(result.ok ? t("settings.appearance.toast.removed") : result.message ?? t("settings.appearance.toast.removeFailed"))
    if (result.ok) router.refresh()
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}>{t("settings.appearance.eyebrow")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.appearance.title")}</h1>
          {canEdit && status !== "idle" && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em", borderRadius: 999, padding: "4px 10px", flex: "none",
              ...(status === "saving" ? { color: "var(--txt-3)", background: "var(--shell)" }
                : status === "saved" ? { color: "var(--ok)", background: "var(--ok-tint)" }
                : { color: "var(--bad)", background: "var(--bad-tint)" }) }}>
              {status === "saving" ? t("settings.appearance.status.saving") : status === "saved" ? t("settings.appearance.status.saved") : statusMsg || t("settings.appearance.status.failed")}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", margin: 0, maxWidth: 720 }}>
          {t("settings.appearance.intro")}
        </p>
      </div>

      {!canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--warn-tint)", color: "var(--warn)", borderRadius: "var(--r3)", padding: "12px 16px", fontSize: 13.5, marginBottom: 14 }}>
          {t("settings.appearance.readOnly")}
        </div>
      )}

      {/* Lead: what to ask a brand for (reference copy, verbatim) */}
      <div style={{ background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", borderRadius: "var(--r2)", padding: 24, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--card)", display: "grid", placeItems: "center", flex: "none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8h.01M11 12h1v5" /><circle cx="12" cy="12" r="9" /></svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>{t("settings.appearance.askTitle")}</div>
            <p style={{ fontSize: 13.5, color: "var(--txt-2)", lineHeight: 1.6, margin: "6px 0 0", maxWidth: 720 }}>
              {t("settings.appearance.askBody")}
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {intake(t).map(([n, title, body, example]) => (
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
          <span style={{ ...eyebrow, flex: "none", paddingTop: 2 }}>{t("settings.appearance.doNotAsk")}</span>
          <span style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.55 }}>
            {t("settings.appearance.doNotAskBody")}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Default appearance: the mode new sessions start in */}
          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.mode.title")}</div>
            <div style={cardSub}>{t("settings.appearance.mode.body")}</div>
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
            <div style={cardTitle}>{t("settings.appearance.logo.title")}</div>
            <div style={cardSub}>{t("settings.appearance.logo.body")}</div>
            <AssetRow label={t("settings.appearance.logo.light")} hint={t("settings.appearance.logo.lightHint")} url={initial.logoLightUrl} kind="logo-light" tall canEdit={canEdit} onUpload={upload} onRemove={remove} />
            <AssetRow label={t("settings.appearance.logo.dark")} hint={t("settings.appearance.logo.darkHint")} url={initial.logoDarkUrl} kind="logo-dark" tall dark canEdit={canEdit} onUpload={upload} onRemove={remove} />
            <AssetRow label={t("settings.appearance.logo.favicon")} hint={t("settings.appearance.logo.faviconHint")} url={initial.faviconUrl} kind="favicon" canEdit={canEdit} onUpload={upload} onRemove={remove} />
          </div>

          {/* Colour */}
          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.color.title")}</div>
            <div style={cardSub}>{t("settings.appearance.color.body")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Slider label={t("settings.appearance.color.accentHue")} value={skin.ah} display={String(Math.round(skin.ah))} min={0} max={360} step={1} onChange={(v) => patch({ ah: v })} disabled={!canEdit}
                swatches={[250, 300, 350, 25, 78, 147].map((hu) => ({ color: `oklch(.58 .17 ${hu})`, on: Math.abs(skin.ah - hu) < 6, title: t("settings.appearance.color.hue", { n: hu }), pick: () => patch({ ah: hu }) }))} />
              <Slider label={t("settings.appearance.color.accentChroma")} value={skin.ac} display={skin.ac.toFixed(3)} min={0} max={0.28} step={0.005} onChange={(v) => patch({ ac: v })} disabled={!canEdit}
                swatches={[0.04, 0.1, 0.16, 0.22].map((c) => ({ color: `oklch(.58 ${c} ${skin.ah})`, on: Math.abs(skin.ac - c) < 0.02, title: t("settings.appearance.color.chroma", { n: c }), pick: () => patch({ ac: c }) }))} />
              <Slider label={t("settings.appearance.color.neutralHue")} value={skin.nh} display={String(Math.round(skin.nh))} min={0} max={360} step={1} onChange={(v) => patch({ nh: v })} disabled={!canEdit}
                swatches={[250, 285, 140, 70, 30, 0].map((hu) => ({ color: `oklch(.80 .02 ${hu})`, dark: true, on: Math.abs(skin.nh - hu) < 6, title: t("settings.appearance.color.neutralHueSwatch", { n: hu }), pick: () => patch({ nh: hu }) }))} />
              <Slider label={t("settings.appearance.color.neutralChroma")} value={skin.nc} display={skin.nc.toFixed(3)} min={0} max={0.02} step={0.001} onChange={(v) => patch({ nc: v })} disabled={!canEdit}
                swatches={[0, 0.006, 0.012, 0.018].map((c) => ({ color: `oklch(.86 ${c} ${skin.nh})`, dark: true, on: Math.abs(skin.nc - c) < 0.002, title: t("settings.appearance.color.neutralChromaSwatch", { n: c }), pick: () => patch({ nc: c }) }))} />
              <Slider label={t("settings.appearance.color.semanticChroma")} value={skin.sc} display={skin.sc.toFixed(3)} min={0.06} max={0.24} step={0.005} onChange={(v) => patch({ sc: v })} disabled={!canEdit}
                hint={t("settings.appearance.color.semanticHint")}
                preview={
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }} aria-hidden>
                    {([[t("settings.appearance.color.success"), "--ok-fill"], [t("settings.appearance.color.warning"), "--warn-fill"], [t("settings.appearance.color.error"), "--bad-fill"]] as const).map(([name, token]) => (
                      <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, display: "block", border: "1px solid var(--line)", background: draftTokens[token] }} />
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--txt-3)" }}>{name}</span>
                      </span>
                    ))}
                  </div>
                } />
            </div>
            {contrastIssues.length > 0 && (
              <div role="status" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 18, padding: "11px 13px", borderRadius: "var(--r3)", background: "var(--warn-tint)", color: "var(--txt)", fontSize: 12.5, lineHeight: 1.5 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 2 }}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: "var(--w-semi)" as never }}>{t("settings.appearance.contrast.title")}</div>
                  {contrastIssues.map((i) => (
                    <div key={i.mode + i.pair} style={{ color: "var(--txt-2)" }}>
                      {t("settings.appearance.contrast.line", { pair: t(`settings.appearance.contrast.pair.${i.pair}`), mode: t(`settings.appearance.contrast.mode.${i.mode}`), ratio: i.ratio.toFixed(1), minimum: i.minimum })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Type */}
          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.type.title")}</div>
            <div style={cardSub}>{t("settings.appearance.type.body")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <Picker label={t("settings.appearance.type.display")} value={skin.font} options={FONT_OPTIONS} face disabled={!canEdit} onPick={(v) => patch({ font: v as string })} />
              <Picker label={t("settings.appearance.type.mono")} value={skin.mono} options={MONO_OPTIONS} face mono disabled={!canEdit} onPick={(v) => patch({ mono: v as string })} />
              <Picker label={t("settings.appearance.type.bold")} value={skin.wb} options={WEIGHT_BOLD_OPTIONS} disabled={!canEdit} onPick={(v) => patch({ wb: v as number })} />
              <Picker label={t("settings.appearance.type.semibold")} value={skin.ws} options={WEIGHT_SEMI_OPTIONS} disabled={!canEdit} onPick={(v) => patch({ ws: v as number })} />
            </div>
          </div>
          {/* Shape — interface geometry, ported from the reference; NOT brand */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={cardTitle}>{t("settings.appearance.shape.title")}</div>
              <span style={{ ...eyebrow, color: "var(--txt-4)" }}>{t("settings.appearance.shape.tag")}</span>
            </div>
            <div style={cardSub}>{t("settings.appearance.shape.body")}</div>
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
          {/* Live preview — both grounds, each scoped to its own resolved
              palette from the canonical engine, with that ground's logo. */}
          <PreviewPanel scheme="light" label={t("settings.appearance.preview.light")} tokens={lightPreview} logoUrl={initial.logoLightUrl} />
          <PreviewPanel scheme="dark" label={t("settings.appearance.preview.dark")} tokens={darkPreview} logoUrl={initial.logoDarkUrl} />

          {/* Presets */}
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 14 }}>{t("settings.appearance.presets")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRESET_PATCHES.map((p) => {
                const on = Math.abs(skin.ah - p.patch.ah) < 4 && Math.abs(skin.ac - p.patch.ac) < 0.03 && p.patch.font === skin.font
                return (
                  <div key={p.label} onClick={() => canEdit && setSkin(clampSkinInput({ ...skin, ...p.patch, ink: p.patch.ink } as SkinInput))}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r3)", cursor: canEdit ? "pointer" : "default", boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}` }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, flex: "none", display: "block", background: p.dot }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{p.label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)" }}>{t(`settings.appearance.preset.${p.id}.hint`)}</span>
                  </div>
                )
              })}
              <CustomSeedsRow
                skin={skin}
                on={!PRESET_PATCHES.some((p) => Math.abs(skin.ah - p.patch.ah) < 4 && Math.abs(skin.ac - p.patch.ac) < 0.03 && p.patch.font === skin.font)}
                canEdit={canEdit}
                onApply={(seeds) => setSkin((s) => clampSkinInput(seedsToSkinInput(seeds, s)))} />
            </div>
          </div>

          {/* Derivation rules */}
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 6 }}>{t("settings.appearance.derived")}</div>
            <p style={{ fontSize: 12.5, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 14px" }}>
              {t("settings.appearance.derivedBody")}
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {rules(t).map(([token, rule], i) => (
                <div key={token} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: i < 5 ? "1px solid var(--line)" : undefined }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-text)", width: 84, flex: "none" }}>{token}</span>
                  <span style={{ fontSize: 12.5, color: "var(--txt-2)", flex: 1, minWidth: 0, lineHeight: 1.45 }}>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolved tokens (from the draft, via the canonical engine) */}
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>{t("settings.appearance.tokens")}</div>
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
              <span className="sh-pick" title={t("settings.appearance.restoreTitle")}
                onClick={() => {
                  if (!canEdit) return
                  const saved = JSON.parse(savedRef.current) as typeof draftRef.current
                  setAppearance(saved.appearance)
                  setSkin(saved.skin)
                  setGeometry(saved.geometry)
                }}
                style={{ fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "9px 16px", cursor: canEdit ? "pointer" : "default" }}>
                {t("settings.appearance.restore")}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

/** One live-preview ground: the draft palette resolved for that theme,
    scoped to this panel, with the ground's own logo where it will appear. */
function PreviewPanel({ scheme, label, tokens, logoUrl }: { scheme: "light" | "dark"; label: string; tokens: CSSProperties; logoUrl: string | null }) {
  const t = useT(settingsCopy)
  return (
    // Ground is the theme's neutral shell — the preview shows the app on
    // its own dark/light ground, never the accent-tinted lead color.
    <div style={{ ...tokens, colorScheme: scheme, background: "var(--shell)", border: "1px solid var(--line-2)", boxSizing: "border-box", borderRadius: "var(--r2)", padding: 22, fontFamily: "var(--font)", color: "var(--txt)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--accent-text)", flex: 1, minWidth: 0 }}>{t("settings.appearance.preview.live")} · {label}</span>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={t("settings.appearance.preview.logoAlt", { ground: label })} style={{ height: 20, maxWidth: 120, objectFit: "contain", flex: "none", display: "block" }} />
        )}
      </div>
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
        <span style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "10px 18px", fontSize: 13.5, fontWeight: "var(--w-semi)" as never }}>{t("settings.appearance.preview.primary")}</span>
        <span style={{ border: "1px solid var(--line-2)", color: "var(--txt-2)", borderRadius: 999, padding: "9px 17px", fontSize: 13.5, fontWeight: "var(--w-semi)" as never }}>{t("settings.appearance.preview.secondary")}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {([[t("settings.appearance.preview.settled"), "ok"], [t("settings.appearance.preview.waiting"), "warn"], [t("settings.appearance.preview.failed"), "bad"]] as const).map(([chip, tone]) => (
          <span key={chip} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 11, color: `var(--${tone})`, background: `var(--${tone}-tint)`, borderRadius: 999, padding: "4px 10px" }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: `var(--${tone}-fill)`, display: "block" }} />
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Custom skin: the two seeds the engine needs, as hex. Reads hue, chroma,
    and fill lightness from the accent and hue/tint from the neutral; every
    other value stays derived. Applies live on every valid edit and persists
    through the same autosave as the sliders — nothing new is stored. */
function CustomSeedsRow({ skin, on, canEdit, onApply }: {
  skin: SkinInput; on: boolean; canEdit: boolean; onApply: (seeds: SkinSeeds) => void
}) {
  const t = useT(settingsCopy)
  const [seeds, setSeeds] = useState<SkinSeeds>(() => skinToSeeds(skin))
  const editing = useRef(false)
  // Presets and sliders move the skin underneath: resync the fields unless
  // the admin is mid-edit here (the resolved hex would fight their typing).
  useEffect(() => {
    if (!editing.current) setSeeds(skinToSeeds(skin))
  }, [skin])

  const invalid = { accent: !normalizeHex(seeds.accent), neutral: !normalizeHex(seeds.neutral) }
  const change = (key: keyof SkinSeeds, value: string) => {
    const next = { ...seeds, [key]: value }
    setSeeds(next)
    if (normalizeHex(next.accent) && normalizeHex(next.neutral)) onApply(next)
  }

  return (
    <div style={{ padding: "12px 14px", borderRadius: "var(--r3)", boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, flex: "none", display: "block", background: `linear-gradient(135deg, ${normalizeHex(seeds.accent) ?? "var(--accent)"} 50%, ${normalizeHex(seeds.neutral) ?? "var(--txt-3)"} 50%)` }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{t("settings.appearance.custom.title")}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)" }}>{t("settings.appearance.custom.hint")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
        {(["accent", "neutral"] as const).map((key) => (
          <label key={key} style={{ minWidth: 0 }}>
            <span style={{ ...eyebrow, display: "block", marginBottom: 6 }}>{t(`settings.appearance.custom.${key}`)}</span>
            <span className="ui-field" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--shell)", border: `1.5px solid ${invalid[key] ? "var(--bad)" : "var(--line-2)"}`, borderRadius: "var(--r3)", padding: "8px 10px", boxSizing: "border-box" }}>
              <input type="color" aria-label={t("settings.appearance.custom.picker", { seed: t(`settings.appearance.custom.${key}`) })} value={normalizeHex(seeds[key]) ?? "#000000"} disabled={!canEdit}
                onChange={(e) => change(key, e.target.value)}
                style={{ width: 22, height: 22, padding: 0, border: "1px solid var(--line)", borderRadius: 6, background: "none", cursor: canEdit ? "pointer" : "default", flex: "none" }} />
              <input value={seeds[key]} disabled={!canEdit} spellCheck={false} maxLength={7} aria-invalid={invalid[key] || undefined}
                onFocus={() => { editing.current = true }}
                onBlur={() => { editing.current = false; if (!invalid[key]) setSeeds((s) => ({ ...s, [key]: normalizeHex(s[key]) ?? s[key] })) }}
                onChange={(e) => change(key, e.target.value)}
                style={{ fontFamily: "var(--mono)", fontSize: 13, width: "100%", minWidth: 0 }} />
            </span>
            {invalid[key] && <span style={{ display: "block", fontSize: 12, color: "var(--bad)", marginTop: 5 }}>{t("settings.appearance.custom.invalidHex")}</span>}
          </label>
        ))}
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
  const t = useT(settingsCopy)
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
          {t("settings.appearance.logo.upload")}
          <input type="file" accept="image/*" onChange={(e) => onUpload(kind, e.target.files?.[0] ?? null)} style={{ display: "none" }} />
        </label>
      )}
      {canEdit && url && (
        <span onClick={() => onRemove(kind)} style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", cursor: "pointer", flex: "none" }}>{t("settings.appearance.logo.remove")}</span>
      )}
    </div>
  )
}
