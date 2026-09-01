"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { requestMagicLink } from "@/core/auth/actions"
import { validateEmail } from "@/core/auth/email-validation"
import { AuthCardHeader } from "../card-header"

/**
 * Entry + Sent states, ported from design-reference/Starter Auth.dc.html.
 * The Sent state renders identically whether or not the address exists —
 * account enumeration is never revealed. The 30s resend cooldown is the
 * reference's; Supabase additionally rate-limits server-side (one link per
 * address per 60s), so the client timer is UX, not the protection.
 */

const pill = {
  display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5,
  fontWeight: "var(--w-semi)" as never, borderRadius: 999, cursor: "pointer",
} as const

function LoginCard() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined
  const demoSent = searchParams.get("state") === "sent"

  const [step, setStep] = useState<"entry" | "sent">(demoSent ? "sent" : "entry")
  const [email, setEmail] = useState(demoSent ? "you@company.com" : "")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const firstFocus = useRef(true)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  // Browsers restoring/autofilling the field can leave the whole value
  // selected. Collapse only that automatic full selection — once, on
  // load/first focus — never a selection the user makes themselves.
  const collapseAutoSelection = (el: HTMLInputElement) => {
    if (el.value && el.selectionStart === 0 && el.selectionEnd === el.value.length) {
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }

  useEffect(() => {
    const el = emailRef.current
    if (el && document.activeElement === el) collapseAutoSelection(el)
  }, [])

  const startCooldown = () => {
    if (timer.current) clearInterval(timer.current)
    setCooldown(30)
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) { clearInterval(timer.current); timer.current = null }
        return Math.max(0, c - 1)
      })
    }, 1000)
  }

  const submit = async () => {
    if (busy) return
    const check = validateEmail(email)
    if (!check.ok) return setError(check.message)
    setBusy(true)
    setError("")
    const result = await requestMagicLink(check.email, next)
    setBusy(false)
    if (!result.sent) return setError(result.message ?? "Something went wrong — try again.")
    setStep("sent")
    startCooldown()
  }

  const [sentNote, setSentNote] = useState("")

  const resend = async () => {
    if (cooldown > 0) return
    setSentNote("")
    startCooldown()
    const result = await requestMagicLink(email, next)
    if (result.rateLimited) setSentNote(result.message ?? "Too many sign-in requests. Wait a few minutes and try again.")
  }

  if (step === "sent") {
    return (
      <>
        <AuthCardHeader stepLabel="Step 2 of 2" />
        <div style={{ flex: "none", padding: "26px 0 4px" }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--accent-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
            </span>
            <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>Check your inbox</h1>
            <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 24px", textAlign: "center" }}>
              We sent a link to <span style={{ color: "var(--txt)", fontWeight: "var(--w-semi)" as never }}>{email}</span>. It works once and expires in fifteen minutes.
            </p>

            <div style={{ background: "var(--shell)", borderRadius: "var(--r2)", padding: 22, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", flex: 1 }}>Nothing arrived?</span>
                <span
                  onClick={resend}
                  style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", borderRadius: 999, padding: "6px 12px", flex: "none", ...(cooldown ? { color: "var(--txt-4)", background: "var(--card)", cursor: "default" } : { color: "var(--accent-text)", background: "var(--accent-tint)", cursor: "pointer" }) }}
                >
                  {cooldown ? `Resend in ${cooldown}s` : "Resend link"}
                </span>
              </div>
              {sentNote && (
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--bad)", marginTop: 14 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flex: "none" }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                  {sentNote}
                </div>
              )}
              <ul style={{ margin: "14px 0 0", paddingLeft: 18, fontSize: 13.5, color: "var(--txt-2)", lineHeight: 1.75 }}>
                <li>Check spam — the sender is <span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>auth@email.attomik.co</span></li>
                <li>Corporate filters can hold it for a minute or two</li>
                <li>Open the link on this device, or it will not carry the session</li>
              </ul>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="sh-pick" style={{ ...pill, color: "var(--txt-2)", border: "1px solid var(--line-2)", padding: "11px 20px" }} onClick={() => { setStep("entry"); setCooldown(0); setError("") }}>
                Use another address
              </span>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AuthCardHeader stepLabel="Step 1 of 2" />
      <div style={{ flex: "none", padding: "26px 0 4px" }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--accent-tint)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </span>
          <h1 style={{ fontSize: 34, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 12px", textAlign: "center" }}>Sign in</h1>
          <p style={{ fontSize: 15, color: "var(--txt-2)", lineHeight: 1.6, margin: "0 0 28px", textAlign: "center" }}>
            No password. Enter your work address and we send a link that signs you in for thirty days on this device.
          </p>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 9 }}>Work email</span>
            <span className="ui-field" style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--card)", borderRadius: "var(--r3)", padding: "14px 16px", boxSizing: "border-box", border: `1.5px solid ${error ? "var(--bad)" : "var(--line-2)"}` }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--txt-3)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
              <input
                ref={emailRef}
                type="email"
                placeholder="you@company.com"
                value={email}
                autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") submit() }}
                onFocus={(e) => {
                  if (!firstFocus.current) return
                  firstFocus.current = false
                  const el = e.currentTarget
                  requestAnimationFrame(() => collapseAutoSelection(el))
                }}
                style={{ fontSize: 15.5, width: "100%" }}
              />
            </span>
          </label>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--bad)", marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flex: "none" }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
              {error}
            </div>
          )}

          <div
            onClick={submit}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "15px 0", fontSize: 15, fontWeight: "var(--w-semi)" as never, cursor: "pointer", opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Sending…" : "Email me a link"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "30px 0 22px" }}>
            <span style={{ height: 1, background: "var(--line)", flex: 1, display: "block" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--txt-4)" }}>or</span>
            <span style={{ height: 1, background: "var(--line)", flex: 1, display: "block" }} />
          </div>
          <span className="sh-pick" title="SSO is not configured yet" style={{ display: "flex", width: "100%", boxSizing: "border-box", alignItems: "center", justifyContent: "center", gap: 10, border: "1px solid var(--line-2)", borderRadius: 999, padding: "14px 20px", fontSize: 14.5, fontWeight: "var(--w-semi)" as never, color: "var(--txt-2)", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            Continue with SSO
          </span>
          <p style={{ fontSize: 12.5, color: "var(--txt-3)", lineHeight: 1.6, margin: "26px 0 0" }}>
            By continuing you accept the <a href="#" style={{ textDecorationThickness: 1 }}>terms</a> and the <a href="#" style={{ textDecorationThickness: 1 }}>privacy notice</a>.
          </p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  )
}
