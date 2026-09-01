/**
 * Email validation with the reference's specific messages — the chain from
 * design-reference/part-records.dc.html `validate()` (the canonical email
 * copy per README §Forms), with the empty-case line from Starter Auth.
 */
export type EmailValidation = { ok: true; email: string } | { ok: false; message: string }

export function validateEmail(raw: string): EmailValidation {
  const email = raw.trim()
  if (!email) return { ok: false, message: "Enter the address you use at work." }
  if (email.indexOf("@") < 0)
    return { ok: false, message: "Missing the @ — an address looks like name@company.com." }
  if (/\s/.test(email)) return { ok: false, message: "Addresses cannot contain spaces." }
  if (email.split("@")[1].indexOf(".") < 0)
    return { ok: false, message: "The domain needs a dot, like company.com." }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email))
    return { ok: false, message: "That does not look like a complete email address." }
  return { ok: true, email }
}

/** Initials for the account chip when no profile exists yet: derived from the email. */
export function emailInitials(email: string): string {
  const local = email.split("@")[0] ?? ""
  const parts = local.split(/[._+-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase() || "?"
}
