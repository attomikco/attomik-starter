"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { createFormatters, listTimeZones, LOCALES, LOCALE_NAMES, type Locale } from "@/core/i18n"
import { useCopy, useFormat, useT } from "@/core/i18n/client"
import { Listbox } from "@/ui/forms/select"
import { useToast } from "@/ui/shell/toast-provider"
import { settingsCopy } from "../copy"
import { saveGeneral } from "./actions"

/**
 * General settings: the workspace's identity, its regional defaults, and
 * membership defaults — everything workspace-level that is not visual
 * brand. The name autosaves 700ms after the last keystroke (one
 * serialized save, the same model Appearance uses); pickers save on
 * change. Every save refreshes the server render so the shell reflects it.
 */

const section: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, maxWidth: 900 }
const sectionTitle: CSSProperties = { fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 4 }
const sectionSub: CSSProperties = { fontSize: 13.5, color: "var(--txt-2)", marginBottom: 18, lineHeight: 1.5 }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }
const fieldLabel: CSSProperties = { ...eyebrow, display: "block", marginBottom: 8 }
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16 }

export type MemberDefaultRole = "admin" | "member" | "viewer"

export interface GeneralInitial {
  displayName: string
  defaultLocale: Locale
  timeZone: string
  defaultMemberRole: MemberDefaultRole
  canEdit: boolean
  facts: {
    id: string
    slug: string
    createdAt: string | null
    owner: string | null
    memberCount: number
  }
}

export function GeneralScreen({ initial }: { initial: GeneralInitial }) {
  const router = useRouter()
  const { say } = useToast()
  const copy = useCopy()
  const t = useT(settingsCopy)
  const fmt = useFormat()
  const canEdit = initial.canEdit
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [defaultLocale, setDefaultLocale] = useState<Locale>(initial.defaultLocale)
  const [timeZone, setTimeZone] = useState(initial.timeZone)
  const [defaultMemberRole, setDefaultMemberRole] = useState<MemberDefaultRole>(initial.defaultMemberRole)
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

  // Pickers save on change; a failed save rolls the control back.
  const pick = async <V,>(current: V, next: V, set: (v: V) => void, patch: Parameters<typeof saveGeneral>[0], okMsg: string) => {
    if (!canEdit || next === current) return
    set(next)
    const result = await saveGeneral(patch)
    if (!result.ok) {
      set(current)
      return say(result.message ?? t("settings.general.status.failed"))
    }
    say(okMsg)
    router.refresh()
  }

  // Sample line: the workspace defaults applied to right now.
  const sample = useMemo(() => {
    const f = createFormatters(defaultLocale, timeZone)
    const now = new Date()
    return `${f.dateTime(now)} · ${f.number(1234.5, { maximumFractionDigits: 1 })}`
  }, [defaultLocale, timeZone])
  const zones = useMemo(() => listTimeZones(timeZone), [timeZone])

  const [copied, setCopied] = useState(false)
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(initial.facts.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      say(t("settings.general.facts.copyFailed"))
    }
  }

  const facts: [string, string][] = [
    [t("settings.general.facts.slug"), initial.facts.slug],
    [t("settings.general.facts.created"), initial.facts.createdAt ? fmt.date(initial.facts.createdAt) : "—"],
    [t("settings.general.facts.owner"), initial.facts.owner ?? "—"],
    [t("settings.general.facts.members"), fmt.number(initial.facts.memberCount)],
  ]

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

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Workspace: name + identity facts */}
        <div style={section}>
          <div style={sectionTitle}>{t("settings.general.workspace.title")}</div>
          <div style={sectionSub}>{t("settings.general.workspace.body")}</div>
          <label style={{ display: "block", maxWidth: 420 }}>
            <span style={fieldLabel}>{t("settings.general.workspace.name")}</span>
            <span className="ui-field" style={{ display: "flex", alignItems: "center", background: "var(--card)", border: "1.5px solid var(--line-2)", borderRadius: "var(--r3)", padding: "11px 14px" }}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!canEdit} maxLength={80} style={{ fontSize: 14.5, width: "100%" }} />
            </span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 18, borderTop: "1px solid var(--line)" }}>
            {facts.map(([label, value]) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ ...eyebrow, width: 150, flex: "none" }}>{label}</span>
                <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}>
              <span style={{ ...eyebrow, width: 150, flex: "none" }}>{t("settings.general.facts.id")}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt-2)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{initial.facts.id}</span>
              <button type="button" className="ui-btn sh-pick" onClick={copyId}
                style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: copied ? "var(--ok)" : "var(--accent-text)", background: copied ? "var(--ok-tint)" : "var(--accent-tint)", borderRadius: 999, padding: "5px 10px", flex: "none" }}>
                {copied ? t("settings.general.facts.copied") : t("settings.general.facts.copy")}
              </button>
            </div>
          </div>
        </div>

        {/* Regional: language + time zone, with a live sample */}
        <div style={section}>
          <div style={sectionTitle}>{t("settings.general.regional.title")}</div>
          <div style={sectionSub}>{t("settings.general.regional.body")}</div>
          <div style={grid}>
            <div style={{ minWidth: 0 }}>
              <span style={fieldLabel}>{t("settings.general.regional.language")}</span>
              <Listbox
                ariaLabel={t("settings.general.regional.language")}
                value={defaultLocale}
                disabled={!canEdit}
                fullWidth
                options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
                onChange={(v) => pick(defaultLocale, v as Locale, setDefaultLocale, { defaultLocale: v }, t("settings.general.toast.localeSaved"))}
              />
              <div style={{ fontSize: 12.5, color: "var(--txt-3)", marginTop: 8, lineHeight: 1.5 }}>{t("settings.general.regional.hint")}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={fieldLabel}>{t("settings.general.regional.timeZone")}</span>
              <Listbox
                ariaLabel={t("settings.general.regional.timeZone")}
                value={timeZone}
                disabled={!canEdit}
                fullWidth
                options={zones}
                onChange={(v) => pick(timeZone, v, setTimeZone, { timeZone: v }, t("settings.general.toast.timeZoneSaved"))}
              />
              <div style={{ fontSize: 12.5, color: "var(--txt-3)", marginTop: 8, lineHeight: 1.5 }}>{t("settings.general.regional.timeZoneHint")}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <span style={{ ...eyebrow, flex: "none" }}>{t("settings.general.regional.sample")}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--txt-2)" }}>{sample}</span>
          </div>
        </div>

        {/* Members: what an invitation starts on */}
        <div style={section}>
          <div style={sectionTitle}>{t("settings.general.members.title")}</div>
          <div style={sectionSub}>{t("settings.general.members.body")}</div>
          <div style={{ maxWidth: 420 }}>
            <span style={fieldLabel}>{t("settings.general.members.defaultRole")}</span>
            <Listbox
              ariaLabel={t("settings.general.members.defaultRole")}
              value={defaultMemberRole}
              disabled={!canEdit}
              fullWidth
              options={(["admin", "member", "viewer"] as const).map((r) => ({ value: r, label: `${copy.roles.labels[r]} — ${copy.roles.meanings[r]}` }))}
              onChange={(v) => pick(defaultMemberRole, v as MemberDefaultRole, setDefaultMemberRole, { defaultMemberRole: v }, t("settings.general.toast.roleSaved"))}
            />
            <div style={{ fontSize: 12.5, color: "var(--txt-3)", marginTop: 8, lineHeight: 1.5 }}>{t("settings.general.members.hint")}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
