"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import {
  resolveSkin, clampSkinInput, hexToOklch, oklchToHex, normalizeHex, skinStylesheetWithDefault,
  themedDeclarations, brandContrastIssues,
  type DefaultAppearance, type ProductGeometry, type SkinInput,
} from "@/core/branding"
import { useT } from "@/core/i18n/client"
import { SegmentedControl } from "@/ui/forms/fields"
import { useSystemPrefersDark, useTheme } from "@/ui/shell/theme"
import { resolveTheme } from "@/ui/shell/theme-resolve"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"
import { removeBrandingAsset, saveAppearance, uploadBrandingAsset, type BrandingAssetKind } from "../appearance/actions"
import { FONT_OPTIONS, MONO_OPTIONS } from "../appearance/options"

/**
 * Brand: accent colour, neutral tone, two fonts, three logo assets, the
 * default appearance — a right-side sheet, not a full-page takeover
 * (Settings → Activity's detail drawer uses the same scrim+480px pattern).
 * One live preview at a time, in whatever appearance actually governs the
 * app right now, with a toggle to check the other ground. Continuous
 * hue/chroma sliders, weight pickers, radii, presets, and a "reset to
 * last saved" control were cut: an accent colour is picked as a hex, a
 * neutral is picked as one of three tones, and everything else (surfaces,
 * text steps, chart ramp, semantic colours, radii) stays computed by the
 * canonical engine (src/core/branding), unedited here.
 */

const card: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 22 }
const cardTitle: CSSProperties = { fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 14 }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }

export interface BrandInitial {
  defaultAppearance: DefaultAppearance
  skin: SkinInput
  geometry: ProductGeometry
  logoLightUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
}

const NEUTRAL_TONES = [
  { id: "warm", nh: 60, nc: 0.01 },
  { id: "cool", nh: 250, nc: 0.01 },
  { id: "neutral", nh: 0, nc: 0.002 },
] as const

/** Classifies the workspace's current (nh, nc) against the three tones — a highlighter, not a source of truth. */
function activeNeutralTone(nh: number, nc: number): (typeof NEUTRAL_TONES)[number]["id"] | null {
  if (nc < 0.004) return "neutral"
  if (nh >= 20 && nh < 150) return "warm"
  return "cool"
}

/** Compact trigger on the General page: current accent (both grounds), font, logo, and a button that opens the sheet. */
export function BrandCompactCard({ initial, onExpand }: { initial: BrandInitial; onExpand: () => void }) {
  const t = useT(settingsCopy)
  const light = useMemo(() => resolveSkin(initial.skin, "light", initial.geometry), [initial.skin, initial.geometry])
  const dark = useMemo(() => resolveSkin(initial.skin, "dark", initial.geometry), [initial.skin, initial.geometry])

  return (
    <div style={{ ...card, maxWidth: 900 }}>
      <div style={cardTitle}>{t("settings.general.brand.title")}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {([[light, t("settings.appearance.preview.light")], [dark, t("settings.appearance.preview.dark")]] as const).map(([tokens, title]) => (
            <span key={title} title={title}
              style={{ width: 34, height: 34, borderRadius: "var(--r3)", background: tokens["--accent"], border: "1px solid var(--line)", display: "block" }} />
          ))}
          <div>
            <div style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never }}>{initial.skin.font}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)" }}>{t("settings.general.brand.current")}</div>
          </div>
        </div>
        {initial.logoLightUrl && <img src={initial.logoLightUrl} alt="" style={{ height: 22, maxWidth: 120, objectFit: "contain" }} />}
        <button type="button" className="ui-btn" onClick={onExpand}
          style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "10px 16px" }}>
          {t("settings.general.brand.change")}
        </button>
      </div>
    </div>
  )
}

export function BrandEditor({ initial, canEdit, onClose }: { initial: BrandInitial; canEdit: boolean; onClose: () => void }) {
  const router = useRouter()
  const { say } = useToast()
  const t = useT(settingsCopy)
  const [appearance, setAppearance] = useState<DefaultAppearance>(initial.defaultAppearance)
  const [skin, setSkin] = useState<SkinInput>(initial.skin)
  const [geometry] = useState<ProductGeometry>(initial.geometry)
  const patch = (p: Partial<SkinInput>) => setSkin((s) => clampSkinInput({ ...s, ...p }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose])

  const systemDark = useSystemPrefersDark()
  const { mode: themeMode } = useTheme()
  const lightPreview = useMemo(() => resolveSkin(skin, "light", geometry) as CSSProperties, [skin, geometry])
  const darkPreview = useMemo(() => resolveSkin(skin, "dark", geometry) as CSSProperties, [skin, geometry])
  // One live preview, in whatever appearance actually governs the app
  // right now — the same three-level chain the shell itself resolves
  // (personal override → workspace default → OS), not just "system = OS":
  // a personal override of "system" with a workspace default of "dark"
  // must show dark even when the OS itself prefers light. The toggle
  // below previews the other ground on demand.
  const [previewScheme, setPreviewScheme] = useState<"light" | "dark">(() => resolveTheme(themeMode, appearance, systemDark))
  // useSystemPrefersDark() reports a default of `false` until its own
  // effect runs (a hydration-timing gap, not a stale value) — when the
  // effective preference is genuinely "system", the initial guess above
  // can be wrong for one render. Re-resolve once that settles, but never
  // fight a manual toggle below.
  const previewTouched = useRef(false)
  useEffect(() => {
    if (previewTouched.current) return
    setPreviewScheme(resolveTheme(themeMode, appearance, systemDark))
  }, [themeMode, appearance, systemDark])

  // Draft applies live to the whole app: an override <style> beats the
  // server-rendered sheet until this component unmounts or a save commits.
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

  type SaveStatus = "idle" | "saving" | "saved" | "error"
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const draftRef = useRef({ appearance, skin, geometry })
  draftRef.current = { appearance, skin, geometry }
  const savedRef = useRef(JSON.stringify(draftRef.current))
  const inFlight = useRef(false)
  const pending = useRef(false)

  const runSave = async () => {
    if (inFlight.current) { pending.current = true; return }
    inFlight.current = true
    let failed = false
    do {
      pending.current = false
      const snapshot = draftRef.current
      const key = JSON.stringify(snapshot)
      if (key === savedRef.current) break
      setStatus("saving")
      const result = await saveAppearance({ defaultAppearance: snapshot.appearance, skin: snapshot.skin, geometry: snapshot.geometry })
      if (!result.ok) {
        failed = true
        setStatus("error")
        setStatusMsg(result.message ?? t("settings.appearance.status.failed"))
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
    const id = setTimeout(runSave, 700)
    return () => clearTimeout(id)
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

  const accentHex = oklchToHex(skin.al ?? 0.58, skin.ac, skin.ah)
  const [accentText, setAccentText] = useState(accentHex)
  useEffect(() => setAccentText(accentHex), [accentHex])
  const applyAccentHex = (hex: string) => {
    setAccentText(hex)
    const normalized = normalizeHex(hex)
    if (!normalized) return
    const parsed = hexToOklch(normalized)
    patch({ ah: Math.round(parsed.h), ac: parsed.c, al: parsed.l, ink: parsed.l > 0.6 ? 0.16 : undefined })
  }

  const neutralActive = activeNeutralTone(skin.nh, skin.nc)
  const contrastOk = useMemo(() => brandContrastIssues(skin).length === 0, [skin])

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(8,10,14,.32)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t("settings.appearance.title")}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "calc(100% - 40px)", zIndex: 91, background: "var(--card)", borderLeft: "1px solid var(--line)", boxShadow: "-20px 0 60px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "sh-rise .18s ease-out" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={eyebrow}>{t("settings.appearance.eyebrow")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: 0 }}>{t("settings.appearance.title")}</h1>
                {canEdit && status !== "idle" && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em", borderRadius: 999, padding: "4px 10px", flex: "none",
                    ...(status === "saving" ? { color: "var(--txt-2)", background: "var(--shell)" }
                      : status === "saved" ? { color: "var(--ok)", background: "var(--ok-tint)" }
                      : { color: "var(--bad)", background: "var(--bad-tint)" }) }}>
                    {status === "saving" ? t("settings.appearance.status.saving") : status === "saved" ? t("settings.appearance.status.saved") : statusMsg || t("settings.appearance.status.failed")}
                  </span>
                )}
              </div>
            </div>
            <button className="ui-btn" aria-label={t("settings.general.brand.close")} onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 999, background: "var(--shell)", display: "grid", placeItems: "center", color: "var(--txt-2)", flex: "none" }}>
              ✕
            </button>
          </div>
        </div>

        <div className="sh-scroll" style={{ flex: 1, minHeight: 0, padding: "18px 24px 26px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
          {!canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--warn-tint)", color: "var(--warn)", borderRadius: "var(--r3)", padding: "12px 16px", fontSize: 13.5 }}>
              {t("settings.appearance.readOnly")}
            </div>
          )}

          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.mode.title")}</div>
            <SegmentedControl ariaLabel={t("settings.appearance.mode.title")} disabled={!canEdit} value={appearance} onChange={setAppearance} stretch
              options={(["light", "dark", "system"] as const).map((a) => ({ value: a, label: t(`settings.appearance.mode.${a}`) }))} />
          </div>

          <PreviewPanel scheme={previewScheme} label={t(`settings.appearance.preview.${previewScheme}`)}
            tokens={previewScheme === "light" ? lightPreview : darkPreview} logoUrl={previewScheme === "light" ? initial.logoLightUrl : initial.logoDarkUrl}
            onToggle={() => { previewTouched.current = true; setPreviewScheme((s) => (s === "light" ? "dark" : "light")) }}
            toggleLabel={t(`settings.appearance.preview.${previewScheme === "light" ? "dark" : "light"}`)} />

          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.color.accentLabel")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="color" value={accentHex} disabled={!canEdit} onChange={(e) => applyAccentHex(e.target.value)}
                style={{ width: 44, height: 44, border: "1px solid var(--line-2)", borderRadius: "var(--r3)", padding: 0, background: "none", cursor: canEdit ? "pointer" : "default", flex: "none" }} />
              <input value={accentText} disabled={!canEdit} spellCheck={false} placeholder="#243B5A"
                onChange={(e) => (normalizeHex(e.target.value) ? applyAccentHex(e.target.value) : setAccentText(e.target.value))}
                style={{ flex: 1, minWidth: 0, fontFamily: "var(--mono)", fontSize: 14, background: "var(--card)", border: `1.5px solid ${accentText && !normalizeHex(accentText) ? "var(--bad)" : "var(--line-2)"}`, borderRadius: "var(--r3)", padding: "10px 12px" }} />
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: contrastOk ? "var(--ok)" : "var(--warn)", marginTop: 10 }}>
              {contrastOk ? t("settings.appearance.custom.contrastOk") : t("settings.appearance.custom.contrastWarnShort")}
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.color.neutralLabel")}</div>
            <SegmentedControl ariaLabel={t("settings.appearance.color.neutralLabel")} disabled={!canEdit} value={neutralActive ?? "neutral"}
              onChange={(id) => { const tone = NEUTRAL_TONES.find((n) => n.id === id); if (tone) patch({ nh: tone.nh, nc: tone.nc }) }}
              stretch options={NEUTRAL_TONES.map((tone) => ({ value: tone.id, label: t(`settings.appearance.color.neutral.${tone.id}`) }))} />
          </div>

          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.type.title")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Picker label={t("settings.appearance.type.display")} value={skin.font} options={FONT_OPTIONS} face disabled={!canEdit} onPick={(v) => patch({ font: v as string })} />
              <Picker label={t("settings.appearance.type.mono")} value={skin.mono} options={MONO_OPTIONS} face mono disabled={!canEdit} onPick={(v) => patch({ mono: v as string })} />
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>{t("settings.appearance.logo.title")}</div>
            <AssetRow label={t("settings.appearance.logo.light")} url={initial.logoLightUrl} kind="logo-light" tall canEdit={canEdit} onUpload={upload} onRemove={remove} />
            <AssetRow label={t("settings.appearance.logo.dark")} url={initial.logoDarkUrl} kind="logo-dark" tall dark canEdit={canEdit} onUpload={upload} onRemove={remove} />
            <AssetRow label={t("settings.appearance.logo.favicon")} url={initial.faviconUrl} kind="favicon" canEdit={canEdit} onUpload={upload} onRemove={remove} last />
          </div>
        </div>
      </div>
    </>
  )
}

/** One live-preview ground at a time — the app's current appearance by default, with a toggle to check the other one before committing to a change. */
function PreviewPanel({ scheme, label, tokens, logoUrl, onToggle, toggleLabel }: { scheme: "light" | "dark"; label: string; tokens: CSSProperties; logoUrl: string | null; onToggle: () => void; toggleLabel: string }) {
  const t = useT(settingsCopy)
  return (
    <div style={{ ...tokens, colorScheme: scheme, background: "var(--shell)", border: "1px solid var(--line-2)", boxSizing: "border-box", borderRadius: "var(--r2)", padding: 22, fontFamily: "var(--font)", color: "var(--txt)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--accent-text)", flex: 1, minWidth: 0 }}>{t("settings.appearance.preview.live")} · {label}</span>
        {logoUrl && (
          <img src={logoUrl} alt={t("settings.appearance.preview.logoAlt", { ground: label })} style={{ height: 20, maxWidth: 120, objectFit: "contain", flex: "none", display: "block" }} />
        )}
        <button type="button" onClick={onToggle}
          style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--txt-2)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "5px 10px", flex: "none", cursor: "pointer" }}>
          {t("settings.appearance.preview.toggle", { ground: toggleLabel })}
        </button>
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
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: "var(--r3)", cursor: "pointer", color: o === value ? "var(--txt)" : "var(--txt-2)" }}>
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

function AssetRow({ label, url, kind, tall, dark, canEdit, onUpload, onRemove, last }: {
  label: string; url: string | null; kind: BrandingAssetKind
  tall?: boolean; dark?: boolean; canEdit: boolean; last?: boolean
  onUpload: (kind: BrandingAssetKind, file: File | null) => void
  onRemove: (kind: BrandingAssetKind) => void
}) {
  const t = useT(settingsCopy)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 0", borderBottom: last ? undefined : "1px solid var(--line)" }}>
      <span style={{ minWidth: tall ? 152 : 46, height: tall ? 56 : 46, borderRadius: tall ? "var(--r3)" : 10, background: dark ? "oklch(0.2 0 0)" : "var(--card)", border: `1px ${url ? "solid var(--line)" : "dashed var(--line-2)"}`, display: "grid", placeItems: "center", padding: tall ? "0 14px" : 0, boxSizing: "border-box" }}>
        {url ? (
          <img src={url} alt="" style={tall ? { maxHeight: 34, maxWidth: 148, display: "block", objectFit: "contain" } : { width: 22, height: 22, display: "block", objectFit: "contain" }} />
        ) : (
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--txt-4)" }}>{t("settings.appearance.logo.none")}</span>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 160, fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em" }}>{label}</div>
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
