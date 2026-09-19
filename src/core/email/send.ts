/**
 * Minimal Resend sender for app-sent mail. Deliberately tiny and pure —
 * the caller reads the key and the From identity from `src/core/env`
 * (`getResendKey`, `getAppEmailFrom`) and passes them in, which keeps this
 * file free of `@/` imports and runnable under `node --test`.
 *
 * Never throws: a failed send is a value the caller decides how to
 * surface (an action that must not fail because of mail returns a warning,
 * not an error). `detail` may echo the provider's response body, so it is
 * for server logs only — never for the UI.
 */

export interface ResendMessage {
  from: string
  to: readonly string[]
  subject: string
  html: string
  text: string
}

export type SendResult = { ok: true } | { ok: false; status: number | null; detail: string }

const RESEND_ENDPOINT = "https://api.resend.com/emails"
const DETAIL_LIMIT = 300

export async function sendResendEmail(
  apiKey: string,
  message: ResendMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: message.from, to: message.to, subject: message.subject, html: message.html, text: message.text }),
    })
    if (res.ok) return { ok: true }
    const detail = await res.text().catch(() => "")
    return { ok: false, status: res.status, detail: detail.slice(0, DETAIL_LIMIT) }
  } catch (error) {
    return { ok: false, status: null, detail: (error instanceof Error ? error.message : String(error)).slice(0, DETAIL_LIMIT) }
  }
}
