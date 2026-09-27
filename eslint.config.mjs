// i18n audit, core: every user-facing string must come from a copy
// dictionary (docs/I18N.md) — a literal string sitting directly in JSX
// under src/modules or src/ui is the exact shape that slips past the
// translator. Scoped narrowly to that one rule, in those two trees only:
// this is not a general lint setup (no eslint-config-next, no style
// rules) — it exists to catch this one class of mistake.
//
// Babel, not @typescript-eslint, parses these files: @typescript-eslint
// (parser and plugin alike) hard-refuses to run against this project's
// TypeScript 7 — a version gate in its own code, not a peer-dependency
// warning — so it cannot even be loaded here today. Babel's TS/JSX
// presets parse the syntax without caring what TypeScript version is
// installed; this rule needs syntax only, no type information.
//
// react-hooks is registered (its rules are never enabled) purely so
// existing `// eslint-disable-next-line react-hooks/exhaustive-deps`
// comments elsewhere in these files resolve to a known rule instead of
// erroring as "Definition for rule ... was not found" — this config
// doesn't own that plugin, it just needs to not choke on it.
//
// Admin-client boundary (ai/guardrails, control plane): the service-role
// client may only ever live in src/core/supabase/admin.ts, which must
// `import "server-only"` (Next then fails the build if any Client Component
// reaches it, however indirectly). no-restricted-imports keeps client
// construction inside src/core/supabase; the small local rule covers the
// two things that rule cannot express — the server-only marker, and a
// "use client" file importing the admin module directly. The starter ships
// no admin client today ("the service-role key is never used by the
// application"); these rules hold the line for the day one is added.
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

const babel = {
  parser: (await import("@babel/eslint-parser")).default,
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ["@babel/preset-react", "@babel/preset-typescript"],
    },
  },
}

const ADMIN_MODULE = /(^|\/)core\/supabase\/admin(\.ts)?$/
const isAdminModule = (filename) => ADMIN_MODULE.test(filename.replace(/\\/g, "/").replace(/\.ts$/, ""))
const SERVICE_KEY_ENV = /^SUPABASE_(SERVICE_ROLE|SECRET)_KEY$/

const adminBoundary = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const filename = context.filename.replace(/\\/g, "/")
    const isAdmin = isAdminModule(filename)
    const mayReadServiceKey = isAdmin || /\/src\/core\/env\//.test(filename)
    let usesClient = false
    let hasServerOnly = false
    return {
      Program(node) {
        usesClient = node.body.some((s) => s.type === "ExpressionStatement" && s.directive === "use client")
      },
      ImportDeclaration(node) {
        const source = node.source.value
        if (source === "server-only") hasServerOnly = true
        if (usesClient && (ADMIN_MODULE.test(source) || (/\/src\/core\/supabase\//.test(filename) && source === "./admin"))) {
          context.report({ node, message: "A \"use client\" file must never import the service-role admin client." })
        }
      },
      MemberExpression(node) {
        const obj = node.object
        const envRead = obj.type === "MemberExpression" && obj.object.type === "Identifier" && obj.object.name === "process" && obj.property.name === "env"
        const name = node.property.type === "Identifier" ? node.property.name : node.property.value
        if (envRead && SERVICE_KEY_ENV.test(String(name)) && !mayReadServiceKey) {
          context.report({ node, message: "The service-role key is read only by src/core/supabase/admin.ts (or src/core/env)." })
        }
      },
      "Program:exit"(node) {
        if (isAdmin && !hasServerOnly) {
          context.report({ node, message: "src/core/supabase/admin.ts must `import \"server-only\"`." })
        }
      },
    }
  },
}

export default [
  { ignores: [".next/**", "node_modules/**"] },
  {
    files: ["src/modules/**/*.tsx", "src/ui/**/*.tsx"],
    languageOptions: babel,
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "react/jsx-no-literals": "error",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: babel,
    plugins: { "react-hooks": reactHooks, attomik: { rules: { "admin-boundary": adminBoundary } } },
    rules: {
      "attomik/admin-boundary": "error",
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@supabase/supabase-js",
          importNames: ["createClient"],
          message: "Supabase clients are created only in src/core/supabase (client.ts, server.ts, admin.ts).",
        }],
      }],
    },
  },
  {
    files: ["src/core/supabase/**"],
    rules: { "no-restricted-imports": "off" },
  },
]
