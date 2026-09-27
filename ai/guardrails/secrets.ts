// Secrets guardrail — narrow and high-confidence by design. It is NOT a
// replacement for GitHub secret scanning or gitleaks: it prefers missing an
// edge case to crying wolf. Three checks over git-tracked files:
//
//   1. no tracked .env file other than .env.example
//   2. no NEXT_PUBLIC_ variable whose name says it is a private credential
//      (NEXT_PUBLIC_ values are inlined into the browser bundle)
//   3. known credential shapes: Supabase service-role JWTs and sb_secret_
//      keys, Resend API keys, PEM private keys
//
// The patterns are assembled from fragments so this file never matches itself.
// Control plane (ai/AGENT_CONTRACT.md): autonomous agents never edit this file.
import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"

export type Finding = { file: string; line: number; check: string; detail: string }

const MAX_BYTES = 2 * 1024 * 1024

// Public by design: the Supabase CLI's local-stack defaults, identical on every
// machine. Committing one discloses nothing.
const LOCAL_STACK_SECRET = "sb_" + "secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

const PUBLIC_PREFIX = "NEXT_" + "PUBLIC_"
const PRIVATE_WORDS = ["SERVICE_ROLE", "SECRET", "PRIVATE", "PASSWORD", "PASSWD", "CREDENTIAL"]
const publicPrivateName = new RegExp(`\\b${PUBLIC_PREFIX}[A-Z0-9_]*(?:${PRIVATE_WORDS.join("|")})[A-Z0-9_]*\\b`, "g")

const jwt = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g
const sbSecret = new RegExp("\\bsb_" + "secret_[A-Za-z0-9_-]{20,}", "g")
const resendKey = new RegExp("\\bre" + "_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\\b", "g")
const pemPrivateKey = new RegExp("-----BEGIN (?:(?:RSA|EC|DSA|OPENSSH|ENCRYPTED|PGP) )?" + "PRIVATE KEY(?: BLOCK)?-----", "g")

/** A tracked path that is an env file other than the committed template. */
export function isForbiddenEnvFile(path: string): boolean {
  const base = path.split("/").pop() ?? path
  return /^\.env(\..+)?$/.test(base) && base !== ".env.example"
}

function serviceRoleJwt(payloadPart: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"))
    // supabase-demo tokens are the CLI's public local-stack defaults.
    return payload?.role === "service_role" && payload?.iss !== "supabase-demo"
  } catch {
    return false
  }
}

/** Every finding in one file's text. */
export function scanText(file: string, text: string): Finding[] {
  const findings: Finding[] = []
  const lines = text.split("\n")
  lines.forEach((content, i) => {
    const at = (check: string, detail: string) => findings.push({ file, line: i + 1, check, detail })
    for (const m of content.matchAll(publicPrivateName)) at("public-private-name", `${m[0]} would inline a private credential into the browser bundle`)
    for (const m of content.matchAll(jwt)) if (serviceRoleJwt(m[1])) at("credential", "Supabase service-role JWT")
    for (const m of content.matchAll(sbSecret)) if (m[0] !== LOCAL_STACK_SECRET) at("credential", "Supabase secret key (sb_secret_…)")
    for (const m of content.matchAll(resendKey)) at("credential", "Resend API key")
    for (const _ of content.matchAll(pemPrivateKey)) at("credential", "PEM private key")
  })
  return findings
}

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
}

export function scanRepo(files = trackedFiles()): Finding[] {
  const findings: Finding[] = []
  for (const file of files) {
    if (isForbiddenEnvFile(file)) findings.push({ file, line: 0, check: "env-file", detail: "tracked env file (only .env.example may be committed)" })
    let size: number
    try {
      size = statSync(file).size
    } catch {
      continue // tracked but deleted in the working tree
    }
    if (size > MAX_BYTES) continue
    const buf = readFileSync(file)
    if (buf.includes(0)) continue // binary
    findings.push(...scanText(file, buf.toString("utf8")))
  }
  return findings
}

