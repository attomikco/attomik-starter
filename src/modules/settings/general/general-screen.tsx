"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { LOCALES, LOCALE_NAMES, type Locale } from "@/core/i18n"
import { useT } from "@/core/i18n/client"
import { Listbox } from "@/ui/forms/select"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"
import { saveGeneral } from "./actions"

/**
 * General settings: the workspace's name and its regional defaults. The
 * name autosaves 700ms after the last keystroke (one serialized save, the
 * same model Appearance uses); the default language saves on pick. Both
 * refresh the server render so the shell reflects the change at once.
 */

const card: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 22 }
const cardTitle: CSSProperties = { fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 4 }
const cardSub: CSSProperties = { fontSize: 13.5, color: "var(--txt-2)", marginBottom: 18 }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }

export interface GeneralInitial {
  displayName: string
  defaultLocale: Locale
  canEdit: boolean
}

export function GeneralScreen({ initial }: { initial: GeneralInitial }) {
  const router = useRouter()
  const { say } = useToast()
  const t = useT(settingsCopy)
  const canEdit = initial.canEdit
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [defaultLocale, setDefaultLocale] = useState<Locale>(initial.defaultLocale)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [statusMsg, setStatusMsg] = useState("")

  // Name autosave: debounced, serialized, latest draft wins.
  const savedName = useRef(initial.displayName)
  const inFlight = useRef(false)
  const pending = useRef(false)
  const draft = useRef(displayName)
  draft.current = displayName
  const runSave = async () => {
    if (inFlight.current) { pending.current = true; return }
    inFlight.current = true
    do {
      pending.current = false
      const name = draft.current
      if (name === savedName.current) break
      setStatus("saving")
      const result = await saveGeneral({ displayName: name })
      if (!result.ok) {
        setStatus("error"); setStatusMsg(result.message ?? t("settings.general.status.failed"))
        break
      }
      savedName.current = name
      setStatus("saved")
      router.refresh()
    } while (pending.current)
    inFlight.current = false
  }
  useEffect(() => {
    if (!canEdit || displayName === savedName.current) return
    const id = setTimeout(runSave, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, canEdit])

  const pickLocale = async (value: string) => {
    const next = value as Locale
    if (!canEdit || next === defaultLocale) return
    const previous = defaultLocale
    setDefaultLocale(next)
    const result = await saveGeneral({ defaultLocale: next })
    if (!result.ok) {
      setDefaultLocale(previous)
      return say(result.message ?? t("settings.general.status.failed"))
    }
    say(t("settings.general.toast.localeSaved"))
    router.refresh()
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}>{t("settings.general.eyebrow")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.general.title")}</h1>
          {canEdit && status !== "idle" && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em", borderRadius: 999, padding: "4px 10px", flex: "none",
              ...(status === "saving" ? { color: "var(--txt-3)", background: "var(--shell)" }
                : status === "saved" ? { color: "var(--ok)", background: "var(--ok-tint)" }
                : { color: "var(--bad)", background: "var(--bad-tint)" }) }}>
              {status === "saving" ? t("settings.general.status.saving") : status === "saved" ? t("settings.general.status.saved") : statusMsg}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "var(--txt-2)", margin: 0, maxWidth: 720 }}>{t("settings.general.intro")}</p>
      </div>

      {!canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--warn-tint)", color: "var(--warn)", borderRadius: "var(--r3)", padding: "12px 16px", fontSize: 13.5, marginBottom: 14, maxWidth: 900 }}>
          {t("settings.general.readOnly")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 14, alignItems: "start", maxWidth: 900 }}>
        <div style={card}>
          <div style={cardTitle}>{t("settings.general.workspace.title")}</div>
          <div style={cardSub}>{t("settings.general.workspace.body")}</div>
          <label style={{ display: "block" }}>
            <span style={{ ...eyebrow, display: "block", marginBottom: 8 }}>{t("settings.general.workspace.name")}</span>
            <span className="ui-field" style={{ display: "flex", alignItems: "center", background: "var(--card)", border: "1.5px solid var(--line-2)", borderRadius: "var(--r3)", padding: "11px 14px" }}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!canEdit} maxLength={80} style={{ fontSize: 14.5, width: "100%" }} />
            </span>
          </label>
        </div>

        <div style={card}>
          <div style={cardTitle}>{t("settings.general.regional.title")}</div>
          <div style={cardSub}>{t("settings.general.regional.body")}</div>
          <span style={{ ...eyebrow, display: "block", marginBottom: 8 }}>{t("settings.general.regional.language")}</span>
          <Listbox
            ariaLabel={t("settings.general.regional.language")}
            value={defaultLocale}
            disabled={!canEdit}
            fullWidth
            options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
            onChange={pickLocale}
          />
          <div style={{ fontSize: 12.5, color: "var(--txt-3)", marginTop: 10, lineHeight: 1.5 }}>{t("settings.general.regional.hint")}</div>
        </div>
      </div>
    </div>
  )
}
