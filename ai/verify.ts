// The verify runner: the definition of repo health (docs/decisions.md).
//
//   pnpm verify      typecheck, lint, test, build, guardrails
//   pnpm verify:db   local Supabase: start, reset, test:db, RLS guardrail
//
// Every step runs even when an earlier one fails; the summary lists each
// step's result and the tail of every failed step's output, and the exit
// status is non-zero if any step failed. No network beyond what the steps
// themselves need (dependency install happens before this runs; verify:db
// pulls the local Supabase images on first start).
//
// Control plane (ai/AGENT_CONTRACT.md): autonomous agents never edit this file.
import { spawnSync } from "node:child_process"

type Step = { name: string; command: string }

const SUITES: Record<string, Step[]> = {
  verify: [
    // typegen first: tsconfig includes .next/types, which a previous build may have left stale.
    { name: "typecheck", command: "pnpm exec next typegen >/dev/null && pnpm run -s typecheck" },
    { name: "lint", command: "pnpm run -s lint" },
    { name: "test", command: "pnpm run -s test" },
    { name: "build", command: "pnpm run -s build" },
    { name: "guardrails", command: "pnpm run -s guardrails" },
  ],
  "verify:db": [
    // Excludes services no check here uses; db, auth, storage, rest and kong stay up.
    { name: "supabase start", command: "supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,mailpit,postgres-meta" },
    { name: "db reset", command: "supabase db reset --local" },
    { name: "test:db", command: "pnpm run -s test:db" },
    { name: "rls guardrail", command: "node ai/guardrails/rls.ts" },
  ],
}

const TAIL_LINES = 40
const MAX_HIGHLIGHTS = 30
// Lines worth surfacing from a failed step even when they scrolled out of the tail.
const HIGHLIGHT = /^\s*not ok\b|\berror\b|\bFAIL(ED)?\b|AssertionError|^\s*(expected|actual):/i

const suite = process.argv.includes("--db") ? "verify:db" : "verify"
const verbose = process.argv.includes("--verbose")
const steps = SUITES[suite]

type Result = { name: string; ok: boolean; seconds: number; output: string }
const results: Result[] = []

for (const step of steps) {
  process.stdout.write(`${suite} ▸ ${step.name} … `)
  const started = Date.now()
  const run = spawnSync("sh", ["-c", `${step.command} 2>&1`], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0" },
  })
  const seconds = (Date.now() - started) / 1000
  const output = (run.stdout ?? "") + (run.error ? `\n${run.error.message}` : "")
  const ok = run.status === 0
  results.push({ name: step.name, ok, seconds, output })
  process.stdout.write(`${ok ? "pass" : `FAIL (exit ${run.status ?? run.signal})`} ${seconds.toFixed(1)}s\n`)
  if (verbose) process.stdout.write(output)
}

const failed = results.filter((r) => !r.ok)
const width = Math.max(...results.map((r) => r.name.length))

console.log(`\n── ${suite} summary ──`)
for (const r of results) console.log(`  ${r.name.padEnd(width)}  ${r.ok ? "pass" : "FAIL"}`)

for (const r of failed) {
  const lines = r.output.trimEnd().split("\n")
  const tailStart = Math.max(0, lines.length - TAIL_LINES)
  const highlights = lines.slice(0, tailStart).filter((l) => HIGHLIGHT.test(l)).slice(0, MAX_HIGHLIGHTS)
  if (highlights.length > 0) {
    console.log(`\n── ${r.name}: error lines above the tail ──`)
    console.log(highlights.join("\n"))
  }
  console.log(`\n── ${r.name}: last ${lines.length - tailStart} of ${lines.length} lines ──`)
  console.log(lines.slice(tailStart).join("\n"))
}

console.log(failed.length === 0 ? `\n${suite}: all ${results.length} steps passed` : `\n${suite}: ${failed.length} of ${results.length} steps failed (${failed.map((r) => r.name).join(", ")})`)
process.exit(failed.length === 0 ? 0 : 1)
