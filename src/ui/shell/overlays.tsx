"use client"

import type { CSSProperties } from "react"
import { signOut } from "@/core/auth/actions"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LOCALES, LOCALE_NAMES, type Locale } from "@/core/i18n"
import { saveUserLocale } from "@/core/i18n/actions"
import { useCopy } from "@/core/i18n/client"
import { Listbox } from "@/ui/forms/select"
import { emailInitials } from "@/core/auth/email-validation"
import type { ShellAccount } from "./app-shell"
import { THEME_MODES, useTheme } from "./theme"
import { useToast } from "./toast-provider"

/**
 * Shell-owned account menu (ported from the reference host). The reference
 * messages/notifications panels return with their modules — the production
 * starter ships no fake data.
 */

const panelStyle: CSSProperties = {
  position: "absolute", top: 48, right: 0, zIndex: 60, width: 380, maxWidth: "calc(100vw - 40px)",
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r2)",
  boxShadow: "0 22px 50px rgba(0,0,0,.18)", overflow: "hidden", animation: "sh-rise .14s ease-out",
}

function AccountRow({ icon, label, hint, onPick }: { icon: string; label: string; hint?: string; onPick: () => void }) {
  return (
    <button type="button" className="ui-btn sh-pick" onClick={onPick}
      style={{ display: "flex", width: "100%", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r3)", fontSize: 14, color: "var(--txt-2)", cursor: "pointer" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d={icon} /></svg>
      {label}
      <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--txt-4)" }}>{hint}</span>
    </button>
  )
}

export function AccountPanel({ account, openPalette, openKeys }: { account: ShellAccount; openPalette: () => void; openKeys: () => void }) {
  const copy = useCopy()
  const { mode, setMode } = useTheme()
  const { say } = useToast()
  const notWired = () => say(copy.account.profileUnavailable)
  const router = useRouter()
  const [locale, setLocale] = useState<Locale | null>(account.locale)
  const [savingLocale, setSavingLocale] = useState(false)
  // Personal language: applies at once and persists on the profile. The
  // server re-renders the whole layout in the new language on refresh.
  const pickLocale = async (value: string) => {
    const next = value === "default" ? null : (value as Locale)
    if (savingLocale || next === locale) return
    const previous = locale
    setLocale(next)
    setSavingLocale(true)
    const result = await saveUserLocale(next)
    setSavingLocale(false)
    if (!result.ok) {
      setLocale(previous)
      return say(result.message ?? copy.account.languageFailed)
    }
    say(copy.account.languageSaved)
    router.refresh()
  }
  const initials = emailInitials(account.email)
  const localPart = account.email.split("@")[0] || account.email

  return (
    <div style={{ ...panelStyle, top: 52, width: 316 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "1px solid var(--line)" }}>
        <span style={{ width: 42, height: 42, borderRadius: 999, background: "var(--lead)", border: "1px solid var(--lead-line)", boxSizing: "border-box", color: "var(--accent-text)", display: "grid", placeItems: "center", fontSize: 15, fontWeight: "var(--w-bold)" as never, flex: "none" }}>{initials}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: "var(--w-semi)" as never, letterSpacing: "-0.015em" }}>{localPart}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>{account.email}</div>
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <AccountRow icon="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" label={copy.account.profile} onPick={notWired} />
        <AccountRow icon="M9 3h6v6H9zM3 9h6v6H3zM15 9h6v6h-6zM9 15h6v6H9z" label={copy.account.commandPalette} hint="⌘K" onPick={openPalette} />
        <AccountRow icon="M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10" label={copy.account.keyboardShortcuts} hint="⌘/" onPick={openKeys} />
      </div>
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--line)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 8 }}>{copy.account.appearance}</div>
        <div style={{ display: "flex", gap: 3, background: "var(--shell)", borderRadius: "var(--r3)", padding: 3 }}>
          {THEME_MODES.map(([choice]) => (
            <span key={choice} onClick={() => setMode(choice)}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: "var(--r3)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer", ...(mode === choice ? { background: "var(--card)", color: "var(--txt)" } : { color: "var(--txt-4)" }) }}>
              {copy.nav.themeModes[choice].short}
            </span>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--line)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)", marginBottom: 8 }}>{copy.account.language}</div>
        <Listbox
          ariaLabel={copy.account.language}
          value={locale ?? "default"}
          disabled={savingLocale}
          fullWidth
          options={[
            { value: "default", label: copy.account.workspaceDefault(LOCALE_NAMES[account.workspaceLocale]) },
            ...LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
          ]}
          onChange={pickLocale}
        />
      </div>
      <div style={{ padding: 10, borderTop: "1px solid var(--line)" }}>
        <span className="sh-signout" onClick={() => void signOut()}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r3)", fontSize: 14, fontWeight: "var(--w-semi)" as never, color: "var(--bad)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M15 17l5-5-5-5M20 12H9M12 3H5v18h7" /></svg>
          {copy.account.signOut}
        </span>
      </div>
    </div>
  )
}
