// `pnpm guardrails`: the guardrails that need no database. The admin-client
// boundary is enforced by ESLint (eslint.config.mjs) and runs under `lint`;
// RLS coverage needs a migrated local database and runs under `verify:db`.
//
// Control plane (ai/AGENT_CONTRACT.md): autonomous agents never edit this file.
import { scanRepo } from "./secrets.ts"

const findings = scanRepo()
if (findings.length === 0) {
  console.log("guardrails: secrets ok (tracked env files, NEXT_PUBLIC_ names, credential patterns)")
} else {
  for (const f of findings) console.log(`guardrails: secrets ${f.file}${f.line ? `:${f.line}` : ""}  [${f.check}] ${f.detail}`)
  console.log(`guardrails: ${findings.length} secret finding(s). Remove the value (rotate it if it was real); never weaken the check to pass.`)
  process.exitCode = 1
}
