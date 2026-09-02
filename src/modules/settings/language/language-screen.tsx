"use client"

import { useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { LOCALES, LOCALE_NAMES, type Locale } from "@/core/i18n"
import { useT } from "@/core/i18n/client"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"
import { saveUserLocale, saveWorkspaceLocale } from "./actions"

/**
 * Language screen: the user's own language (saved on the profile, applied
 * on every device) and, for owners/admins, the workspace default that new
 * members and the pre-auth screens start with. Picking an option saves at
 * once — a one-field preference, like Appearance's autosave — and
 * refreshes the server render so the whole shell switches language.
 */

const card: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 22 }
const cardTitle: CSSProperties = { fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 4 }
const cardSub: CSSProperties = { fontSize: 13.5, color: "var(--txt-2)", marginBottom: 18 }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }

export interface LanguageInitial {
  /** The user's saved choice; null means "follow the workspace default". */
  userLocale: Locale | null
  workspaceLocale: Locale
  canEditWorkspace: boolean
}

export function LanguageScreen({ initial }: { initial: LanguageInitial }) {
  const router = useRouter()
  const { say } = useToast()
  const t = useT(settingsCopy)
  const [userLocale, setUserLocale] = useState<Locale | null>(initial.userLocale)
  const [workspaceLocale, setWorkspaceLocale] = useState<Locale>(initial.workspaceLocale)
  const [busy, setBusy] = useState(false)

  const pickUser = async (locale: Locale | null) => {
    if (busy || locale === userLocale) return
    setBusy(true)
    const previous = userLocale
    setUserLocale(locale)
    const result = await saveUserLocale(locale)
    setBusy(false)
    if (!result.ok) {
      setUserLocale(previous)
      return say(result.message ?? t("settings.language.error.saveFailed"))
    }
    say(t("settings.language.toast.saved"))
    router.refresh()
  }

  const pickWorkspace = async (locale: Locale) => {
    if (busy || !initial.canEditWorkspace || locale === workspaceLocale) return
    setBusy(true)
    const previous = workspaceLocale
    setWorkspaceLocale(locale)
    const result = await saveWorkspaceLocale(locale)
    setBusy(false)
    if (!result.ok) {
      setWorkspaceLocale(previous)
      return say(result.message ?? t("settings.language.error.saveFailed"))
    }
    say(t("settings.language.toast.workspaceSaved"))
    router.refresh()
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}>{t("settings.language.eyebrow")}</div>
        <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.language.title")}</h1>
        <p style={{ fontSize: 14, color: "var(--txt-2)", margin: 0, maxWidth: 720 }}>{t("settings.language.intro")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 14, alignItems: "start", maxWidth: 900 }}>
        <div style={card}>
          <div style={cardTitle}>{t("settings.language.yours.title")}</div>
          <div style={cardSub}>{t("settings.language.yours.body")}</div>
          <Options
            ariaLabel={t("settings.language.yours.title")}
            value={userLocale ?? "default"}
            disabled={busy}
            options={[
              { value: "default", label: t("settings.language.yours.default", { name: LOCALE_NAMES[workspaceLocale] }) },
              ...LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
            ]}
            onPick={(v) => pickUser(v === "default" ? null : (v as Locale))}
          />
        </div>

        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={cardTitle}>{t("settings.language.workspace.title")}</div>
            <span style={{ ...eyebrow, color: "var(--txt-4)" }}>{t("settings.language.workspace.tag")}</span>
          </div>
          <div style={cardSub}>{t("settings.language.workspace.body")}</div>
          <Options
            ariaLabel={t("settings.language.workspace.title")}
            value={workspaceLocale}
            disabled={busy || !initial.canEditWorkspace}
            options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
            onPick={(v) => pickWorkspace(v as Locale)}
          />
          {!initial.canEditWorkspace && (
            <div style={{ fontSize: 12.5, color: "var(--txt-3)", marginTop: 12 }}>{t("settings.language.workspace.readOnly")}</div>
          )}
        </div>
      </div>
    </div>
  )
}

/** The reference radio-row pattern (Task 007 form primitives), one row per language. */
function Options({ ariaLabel, value, options, disabled, onPick }: {
  ariaLabel: string
  value: string
  options: { value: string; label: string }[]
  disabled: boolean
  onPick: (value: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button type="button" key={o.value} className="ui-btn" role="radio" aria-checked={on} disabled={disabled} onClick={() => onPick(o.value)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r3)", boxSizing: "border-box", background: "var(--card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}`, cursor: disabled ? "default" : "pointer", opacity: disabled && !on ? 0.7 : 1, width: "100%" }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${on ? "var(--accent-text)" : "var(--line-2)"}`, display: "grid", placeItems: "center", flex: "none", boxSizing: "border-box" }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, display: "block", background: on ? "var(--accent-text)" : "transparent" }} />
            </span>
            <span style={{ fontSize: 14, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.01em", minWidth: 0 }}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
