import { defineConfig } from "@playwright/test"
import { resolveE2eTarget } from "./e2e/support/target"

/**
 * E2E config. Runs a real `next build && next start` (production mode,
 * matching the reported bug) against a LOCAL Supabase stack — never the
 * hosted project. Two things make that a guarantee rather than a habit:
 *
 *  1. `resolveE2eTarget()` (e2e/support/target.ts) decides the target from
 *     E2E_SUPABASE_* and throws, before anything starts, unless the URL is
 *     loopback and no key belongs to the hosted project. A hosted
 *     NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL in the shell fails fast too.
 *  2. This config OWNS the server under test. It is built and started here
 *     with the local target injected into its environment (process env wins
 *     over .env.local, and NEXT_PUBLIC_* is inlined at build time, so the
 *     override has to be on the build command too), and it never reuses an
 *     already-running server — one started by hand would have read
 *     .env.local, i.e. the hosted project. Outbound mail/AI keys are blanked
 *     so a spec can never send a real email.
 *
 * Auth is a real magic-link sign-in minted via the Supabase admin API
 * (e2e/support/login.ts), never a mocked session. Setup: docs/SUPABASE.md.
 */
const target = resolveE2eTarget()
const PORT = 3010

export default defineConfig({
  testDir: "./e2e",
  // Only specs: e2e/support/*.test.ts are node:test unit tests (`pnpm test`).
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: target.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: target.publishableKey,
      SUPABASE_URL: target.url,
      RESEND_API_KEY: "",
      ANTHROPIC_API_KEY: "",
    },
  },
})
