/**
 * Email validation with the reference's specific problems — the chain from
 * design-reference/part-records.dc.html `validate()`. The CODE is the
 * contract; the message is copy (`copy.auth.emailErrors[code]`) resolved
 * by the caller in the active locale, so this stays pure and node-testable.
 */
export type EmailValidationCode = "empty" | "missing_at" | "spaces" | "dotless_domain" | "incomplete"

export type EmailValidation = { ok: true; email: string } | { ok: false; code: EmailValidationCode }

export function validateEmail(raw: string): EmailValidation {
  const email = raw.trim()
  if (!email) return { ok: false, code: "empty" }
  if (email.indexOf("@") < 0) return { ok: false, code: "missing_at" }
  if (/\s/.test(email)) return { ok: false, code: "spaces" }
  if (email.split("@")[1].indexOf(".") < 0) return { ok: false, code: "dotless_domain" }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, code: "incomplete" }
  return { ok: true, email }
}

export function emailInitials(email: string): string {
  const local = email.split("@")[0] ?? ""
  const parts = local.split(/[._+-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase() || "?"
}
