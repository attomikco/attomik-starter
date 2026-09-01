import { z } from "zod"

/**
 * Canonical environment layer. Validation is lazy: the app builds and runs
 * without Supabase credentials, and fails with a clear message the moment
 * Supabase functionality is actually invoked.
 *
 * NEXT_PUBLIC_* values are inlined into the browser bundle at build time,
 * so they must be referenced as literal `process.env.NEXT_PUBLIC_...`
 * expressions — never via dynamic lookup.
 */

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL (https://<ref>.supabase.co)",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, {
    error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required",
  }),
})

function readSupabaseEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

/** True when both Supabase variables are set. Never throws. */
export function hasSupabaseEnv(): boolean {
  return supabaseEnvSchema.safeParse(readSupabaseEnv()).success
}

/** Validated Supabase credentials. Throws with a clear message when missing. */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const parsed = supabaseEnvSchema.safeParse(readSupabaseEnv())
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    throw new Error(
      `Supabase environment is not configured:\n${issues.join("\n")}\n` +
        "Copy .env.example to .env.local and fill in your project values.",
    )
  }
  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}
