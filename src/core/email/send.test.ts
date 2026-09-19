import { test } from "node:test"
import assert from "node:assert/strict"
import { sendResendEmail, type ResendMessage } from "./send.ts"

const message: ResendMessage = { from: "App <app@example.com>", to: ["a@example.com", "b@example.com"], subject: "Hi", html: "<p>Hi</p>", text: "Hi" }

test("posts the message to Resend with a bearer key and every recipient", async () => {
  let seen: { url: string; init: RequestInit } | null = null
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen = { url, init }
    return new Response("{}", { status: 200 })
  }) as unknown as typeof fetch

  const result = await sendResendEmail("re_key", message, fakeFetch)
  assert.deepEqual(result, { ok: true })
  assert.equal(seen!.url, "https://api.resend.com/emails")
  assert.equal(seen!.init.method, "POST")
  assert.equal((seen!.init.headers as Record<string, string>).authorization, "Bearer re_key")
  assert.deepEqual(JSON.parse(seen!.init.body as string), message)
})

test("a rejected send is a value, with the provider's status and a trimmed detail", async () => {
  const fakeFetch = (async () => new Response("x".repeat(1000), { status: 422 })) as unknown as typeof fetch
  const result = await sendResendEmail("re_key", message, fakeFetch)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 422)
    assert.equal(result.detail.length, 300)
  }
})

test("a network failure never throws", async () => {
  const fakeFetch = (async () => { throw new Error("socket hang up") }) as unknown as typeof fetch
  const result = await sendResendEmail("re_key", message, fakeFetch)
  assert.deepEqual(result, { ok: false, status: null, detail: "socket hang up" })
})
