"use client"

import { useCopy } from "@/core/i18n/client"

/**
 * Last-resort boundary (replaces the root layout when it crashes).
 * Deliberately self-contained: no tokens are guaranteed here.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = useCopy()
  return (
    <html lang={copy.lang}>
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f9fa", color: "#0e1013", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 10px" }}>{copy.errors.title}</h1>
          <p style={{ fontSize: 14.5, color: "#4c5158", lineHeight: 1.6, margin: "0 0 22px" }}>
            {copy.errors.startupBody}
          </p>
          <button onClick={reset}
            style={{ font: "inherit", fontWeight: 600, fontSize: 14.5, color: "#fff", background: "oklch(0.52 0.16 250)", border: "none", borderRadius: 999, padding: "12px 24px", cursor: "pointer" }}>
            {copy.errors.tryAgain}
          </button>
          {error.digest && <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#a6abb1", marginTop: 14 }}>{copy.errors.reference(error.digest)}</div>}
        </div>
      </body>
    </html>
  )
}
