import type { ReactNode } from "react"

/**
 * Fields in a responsive auto-fit grid (docs/UI_STANDARDS.md, Forms). A
 * field whose content can grow — chips, a textarea, a list of rows — goes
 * in FormGrid.Full so it takes its own full-width row instead of
 * stretching the row it shares.
 */
export function FormGrid({ min = 220, children }: { min?: number; children: ReactNode }) {
  return <div data-form-grid style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 14 }}>{children}</div>
}

function Full({ children }: { children: ReactNode }) {
  return <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>{children}</div>
}
FormGrid.Full = Full
