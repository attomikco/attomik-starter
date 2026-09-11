"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { useT } from "@/core/i18n/client"
import { nameInitials } from "@/ui/initials"
import { settingsCopy } from "../copy"
import { removeAvatar, saveDisplayName, uploadAvatar } from "./actions"

/**
 * Profile: a person's own name and photo. No role gate — profiles RLS is
 * own-row-only, so every member (including a viewer) can edit their own.
 * The name field autosaves 700ms after the last keystroke, the same
 * debounced/serialized model General uses for the workspace name.
 */

const section: CSSProperties = { background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, maxWidth: 900 }
const sectionTitle: CSSProperties = { fontSize: 16, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em", marginBottom: 4 }
const eyebrow: CSSProperties = { fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)" }
const fieldLabel: CSSProperties = { ...eyebrow, display: "block", marginBottom: 8 }

export interface ProfileInitial {
  displayName: string
  email: string
  avatarUrl: string | null
}

export function ProfileScreen({ initial }: { initial: ProfileInitial }) {
  const router = useRouter()
  const t = useT(settingsCopy)
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [statusMsg, setStatusMsg] = useState("")

  // Name autosave: debounced, serialized, latest draft wins — same model
  // as General's workspace-name field.
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
      const result = await saveDisplayName(name)
      if (!result.ok) {
        setStatus("error"); setStatusMsg(result.message ?? t("settings.profile.status.failed"))
        break
      }
      savedName.current = name
      setStatus("saved")
      router.refresh()
    } while (pending.current)
    inFlight.current = false
  }
  useEffect(() => {
    if (displayName === savedName.current) return
    const id = setTimeout(runSave, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName])

  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState<string | null>(null)
  const upload = async (file: File | null) => {
    if (!file) return
    setPhotoBusy(true)
    setPhotoMsg(null)
    const fd = new FormData()
    fd.set("file", file)
    const result = await uploadAvatar(fd)
    setPhotoBusy(false)
    if (!result.ok) return setPhotoMsg(result.message ?? t("settings.profile.toast.uploadFailed"))
    setAvatarUrl(URL.createObjectURL(file))
    router.refresh()
  }
  const remove = async () => {
    setPhotoBusy(true)
    setPhotoMsg(null)
    const result = await removeAvatar()
    setPhotoBusy(false)
    if (!result.ok) return setPhotoMsg(result.message ?? t("settings.profile.toast.removeFailed"))
    setAvatarUrl(null)
    router.refresh()
  }

  return (
    <div className="sh-scroll" style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={eyebrow}>{t("settings.profile.eyebrow")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.03em", margin: "6px 0 6px" }}>{t("settings.profile.title")}</h1>
          {status !== "idle" && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em", borderRadius: 999, padding: "4px 10px", flex: "none",
              ...(status === "saving" ? { color: "var(--txt-3)", background: "var(--shell)" }
                : status === "saved" ? { color: "var(--ok)", background: "var(--ok-tint)" }
                : { color: "var(--bad)", background: "var(--bad-tint)" }) }}>
              {status === "saving" ? t("settings.profile.status.saving") : status === "saved" ? t("settings.profile.status.saved") : statusMsg}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={section}>
          <div style={sectionTitle}>{t("settings.profile.photo.title")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
            <span style={{ width: 64, height: 64, borderRadius: 999, background: "var(--card)", border: "1px solid var(--line)", display: "grid", placeItems: "center", flex: "none", overflow: "hidden" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : <span style={{ fontSize: 20, fontWeight: "var(--w-bold)" as never, color: "var(--txt-2)" }}>{displayName ? nameInitials(displayName) : "—"}</span>}
            </span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12.5, color: "var(--txt-2)", lineHeight: 1.5 }}>{t("settings.profile.photo.hint")}</div>
              {photoMsg && <div style={{ fontSize: 12.5, color: "var(--bad)", marginTop: 6 }}>{photoMsg}</div>}
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: "var(--w-semi)" as never, color: "var(--accent-text)", background: "var(--accent-tint)", borderRadius: 999, padding: "10px 16px", cursor: photoBusy ? "default" : "pointer", flex: "none", opacity: photoBusy ? 0.6 : 1 }}>
              {t("settings.profile.photo.upload")}
              <input type="file" accept="image/*" disabled={photoBusy} onChange={(e) => upload(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
            </label>
            {avatarUrl && (
              <span onClick={photoBusy ? undefined : remove} style={{ fontSize: 13, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", cursor: photoBusy ? "default" : "pointer", flex: "none" }}>
                {t("settings.profile.photo.remove")}
              </span>
            )}
          </div>
        </div>

        <div style={section}>
          <label style={{ display: "block", maxWidth: 420 }}>
            <span style={fieldLabel}>{t("settings.profile.name")}</span>
            <span className="ui-field" style={{ display: "flex", alignItems: "center", background: "var(--card)", border: "1.5px solid var(--line-2)", borderRadius: "var(--r3)", padding: "11px 14px" }}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("settings.profile.namePlaceholder")} maxLength={80} style={{ fontSize: 14.5, width: "100%" }} />
            </span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 18, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "10px 0" }}>
              <span style={{ ...eyebrow, width: 100, flex: "none" }}>{t("settings.profile.email")}</span>
              <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{initial.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
