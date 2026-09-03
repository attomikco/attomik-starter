"use client"

import { useMemo, useState, type CSSProperties } from "react"
import type { EmailPalette } from "@/core/email"
import { useT } from "@/core/i18n/client"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"

/**
 * Settings → Emails, ported from design-reference/Starter Emails: the
 * template list, the client-chrome preview stage with width and appearance
 * toggles, and the meta column (send details, blocks, rules, tokens).
 *
 * The preview is an iframe fed the rendered HTML with `sandbox=""` — no
 * scripts, no navigation, no styles leaking either way, which is the only
 * honest way to show email markup inside an application.
 *
 * Read-only by design. Email words live in the dictionary and email colour
 * in the skin; there is nothing to edit on this screen, and adding an
 * editor here would create a second place to own copy.
 */

export interface EmailPreview {
  id: string
  group: "authentication" | "membership"
  delivery: "supabase" | "resend"
  branding: "project" | "workspace"
  meta: [string, string][]
  subject: string
  preheader: string
  blocks: string[]
  text: string
  html: { light: string; dark: string }
  locale: string
  brandName: string
  sender: string
  palettes: { light: EmailPalette; dark: EmailPalette }
}

const panel: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 20, boxSizing: "border-box" }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }
const RULE_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const
const TOKEN_KEYS = ["ground", "card", "inset", "accent", "ink", "ink2"] as const

export function EmailsScreen({ previews }: { previews: EmailPreview[] }) {
  const t = useT(settingsCopy)
  const { say } = useToast()
  const [id, setId] = useState(previews[0]?.id ?? "")
  const [view, setView] = useState<"preview" | "html" | "text">("preview")
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop")
  const [mode, setMode] = useState<"light" | "dark">("light")

  const current = previews.find((p) => p.id === id) ?? previews[0]

  // Grouped exactly like the reference rail: group heading, then rows.
  const groups = useMemo(() => {
    const out: { group: string; items: EmailPreview[] }[] = []
    for (const p of previews) {
      let g = out.find((x) => x.group === p.group)
      if (!g) { g = { group: p.group, items: [] }; out.push(g) }
      g.items.push(p)
    }
    return out
  }, [previews])

  if (!current) return null

  const palette = current.palettes[mode]
  const source = view === "html" ? current.html[mode] : current.text

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(source)
      say(t("settings.emails.copied"))
    } catch {
      say(t("settings.emails.copyFailed"))
    }
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}>{t("settings.emails.eyebrow")}</div>
        <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0" }}>{t("settings.emails.title")}</h1>
        <p style={{ fontSize: 14, color: "var(--txt-2)", margin: 0, maxWidth: 760 }}>{t("settings.emails.intro")}</p>
      </div>

      <div className="sh-workbench">
        {/* Template list */}
        <div style={{ ...panel, padding: 12 }}>
          {groups.map((g) => (
            <div key={g.group} style={{ marginBottom: 10 }}>
              <div style={{ ...eyebrow, padding: "4px 11px 8px" }}>{t(`settings.emails.group.${g.group}`)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {g.items.map((p) => {
                  const on = p.id === current.id
                  // Template ids follow Supabase's naming (magic_link); copy
                  // keys are English identifiers, so camel-case the id.
                  const nameKey = p.id.replace(/_(\w)/g, (_m, c: string) => c.toUpperCase())
                  return (
                    <button key={p.id} type="button" className={`ui-btn ${on ? "" : "sh-pick"}`} aria-pressed={on} onClick={() => setId(p.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: "var(--r3)", fontSize: 14,
                        ...(on ? { background: "var(--card)", color: "var(--txt)", fontWeight: "var(--w-semi)" as never } : { color: "var(--txt-2)" }) }}>
                      <span aria-hidden style={{ width: 4, height: 16, borderRadius: 2, flex: "none", display: "block", background: on ? "var(--accent)" : "var(--line-2)" }} />
                      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>{t(`settings.emails.template.${nameKey}`)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Stage */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ ...panel, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...eyebrow, marginBottom: 7 }}>{t(`settings.emails.kind.${current.delivery}`)}</div>
              <div style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", lineHeight: 1.15 }}>{current.subject}</div>
            </div>
            <Segmented
              options={[["preview", t("settings.emails.view.preview")], ["html", t("settings.emails.view.html")], ["text", t("settings.emails.view.text")]]}
              value={view} onPick={(v) => setView(v as typeof view)} />
            {view === "preview" && (
              <>
                <Segmented
                  options={[["desktop", t("settings.emails.width.desktop")], ["mobile", t("settings.emails.width.mobile")]]}
                  value={width} onPick={(v) => setWidth(v as typeof width)} />
                <Segmented
                  options={[["light", t("settings.emails.mode.light")], ["dark", t("settings.emails.mode.dark")]]}
                  value={mode} onPick={(v) => setMode(v as typeof mode)} />
              </>
            )}
          </div>

          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)", overflow: "hidden", background: "var(--shell)", display: "flex", flexDirection: "column", minHeight: 560 }}>
            {/* Mail-client chrome, so the preview is read as an inbox, not a page */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--card)" }}>
              <span style={{ ...eyebrow, fontSize: 10, letterSpacing: ".08em", flex: "none" }}>{t("settings.emails.chrome.from")}</span>
              <span style={{ fontSize: 12.5, color: "var(--txt-2)", flex: "none" }}>{current.sender}</span>
              <span aria-hidden style={{ width: 1, height: 14, background: "var(--line-2)", display: "block", flex: "none" }} />
              <span style={{ fontSize: 12.5, color: "var(--txt)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.subject}</span>
            </div>

            {view === "preview" ? (
              <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", background: palette.ground, padding: width === "mobile" ? "18px 0" : 0 }}>
                <iframe
                  key={`${current.id}-${mode}-${width}`}
                  title={current.subject}
                  srcDoc={current.html[mode]}
                  sandbox=""
                  style={{ width: width === "mobile" ? 390 : "100%", maxWidth: "100%", height: 620, border: width === "mobile" ? "1px solid var(--line-2)" : "none", borderRadius: width === "mobile" ? "var(--r3)" : 0, background: palette.ground, display: "block" }}
                />
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px 0" }}>
                  <button type="button" className="ui-btn sh-pick" onClick={copySource}
                    style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "5px 12px" }}>
                    {t("settings.emails.copy")}
                  </button>
                </div>
                <pre className="sh-scroll" style={{ flex: 1, minHeight: 0, margin: 0, padding: "10px 18px 18px", fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.6, color: "var(--txt-2)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {source}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Meta column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={panel}>
            <div style={{ ...eyebrow, marginBottom: 14 }}>{t("settings.emails.sendDetails")}</div>
            <DetailRows
              rows={[
                ...current.meta.map(([label, value]) => [t(`settings.emails.metaLabel.${label}`), t(`settings.emails.metaValue.${value}`)] as [string, string]),
                [t("settings.emails.detail.language"), current.locale],
                [t("settings.emails.detail.branding"), t(`settings.emails.branding.${current.branding}`)],
                [t("settings.emails.detail.preheader"), current.preheader],
              ]}
            />
            {current.branding === "project" && (
              <p style={{ fontSize: 12.5, color: "var(--txt-3)", lineHeight: 1.55, margin: "14px 0 0" }}>{t("settings.emails.brandingNote")}</p>
            )}
          </div>

          <div style={panel}>
            <div style={{ ...eyebrow, marginBottom: 10 }}>{t("settings.emails.blocks")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {current.blocks.map((b, i) => (
                <span key={`${b}-${i}`} style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "5px 10px" }}>
                  {t(`settings.emails.block.${b}`)}
                </span>
              ))}
            </div>
          </div>

          <div style={panel}>
            <div style={{ ...eyebrow, marginBottom: 10 }}>{t("settings.emails.rules")}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {RULE_KEYS.map((n, i) => (
                <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", ...(i < RULE_KEYS.length - 1 ? { borderBottom: "1px solid var(--line)" } : {}) }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--accent-text)", flex: "none", paddingTop: 1 }}>{`0${n}`}</span>
                  <span style={{ fontSize: 12.5, color: "var(--txt-2)", lineHeight: 1.5 }}>{t(`settings.emails.rule.${n}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...panel, background: "var(--lead)", border: "1px solid var(--lead-line)" }}>
            <div style={{ ...eyebrow, color: "var(--accent-text)", marginBottom: 10 }}>{t("settings.emails.tokens")}</div>
            <p style={{ fontSize: 12.5, color: "var(--txt-2)", lineHeight: 1.55, margin: "0 0 12px" }}>{t("settings.emails.tokensBody")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TOKEN_KEYS.map((key) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span aria-hidden style={{ width: 18, height: 18, borderRadius: 6, flex: "none", display: "block", border: "1px solid var(--line-2)", background: palette[key] }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-2)", flex: 1, minWidth: 0 }}>{palette[key]}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-3)" }}>{t(`settings.emails.token.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The reference's pill segmented control: shell ground, card on-state. */
function Segmented({ options, value, onPick }: { options: [string, string][]; value: string; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--card)", borderRadius: 999, padding: 4, flex: "none" }}>
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <button key={key} type="button" className="ui-btn" aria-pressed={on} onClick={() => onPick(key)}
            style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "7px 14px", borderRadius: 999, whiteSpace: "nowrap",
              ...(on ? { background: "var(--shell)", color: "var(--txt)" } : { color: "var(--txt-4)" }) }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function DetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map(([label, value], i) => (
        <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "9px 0", ...(i < rows.length - 1 ? { borderBottom: "1px solid var(--line)" } : {}) }}>
          <span style={{ fontSize: 13, color: "var(--txt-2)", flex: 1, minWidth: 0 }}>{label}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--txt)", textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
