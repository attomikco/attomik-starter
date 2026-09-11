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
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  { ignores: [".next/**", "node_modules/**"] },
  {
    files: ["src/modules/**/*.tsx", "src/ui/**/*.tsx"],
    languageOptions: {
      parser: (await import("@babel/eslint-parser")).default,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react", "@babel/preset-typescript"],
        },
      },
    },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      "react/jsx-no-literals": "error",
    },
  },
]
