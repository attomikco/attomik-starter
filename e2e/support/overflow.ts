import type { Page } from "@playwright/test"

/**
 * Measures horizontal overflow of the rendered page, in the browser.
 *
 * Two things count as a failure at a phone width:
 *  - `document.documentElement.scrollWidth` wider than the viewport, and
 *  - any visible element whose right edge is past the viewport.
 *
 * The second matters more than it looks: the shell pins html/body to the
 * viewport (overflow hidden) and every screen scrolls inside `.sh-scroll`
 * (overflow-x hidden), so a too-wide chart or row never widens the document.
 * It is silently clipped. Only the element check catches it.
 *
 * An element past the edge is excused only when a dedicated horizontal
 * scroller (overflow-x auto|scroll) that itself fits the viewport contains it
 * (a tab strip, a <pre>), or when it opts out with `data-allow-overflow`.
 * Overflow-hidden ancestors do NOT excuse it: that is the clipped-content bug.
 */

export interface Offender {
  element: string
  left: number
  right: number
  text: string
}

export interface OverflowReport {
  viewportWidth: number
  scrollWidth: number
  offenders: Offender[]
}

export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const scrollWidth = document.documentElement.scrollWidth
    const EPS = 1

    const describe = (el: Element): string => {
      const id = el.id ? `#${el.id}` : ""
      const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""
      const parent = el.parentElement
      return `${parent ? parent.tagName.toLowerCase() + " > " : ""}${el.tagName.toLowerCase()}${id}${cls}`
    }

    const insideFittingHScroller = (el: Element): boolean => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a)
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && a.getBoundingClientRect().right <= viewportWidth + EPS) return true
      }
      return false
    }

    const past: Element[] = []
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const cs = getComputedStyle(el)
      if (cs.display === "none" || cs.visibility === "hidden") continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.right <= viewportWidth + EPS) continue
      if (el.closest("[data-allow-overflow]")) continue
      if (insideFittingHScroller(el)) continue
      past.push(el)
    }
    // Report the outermost offenders only: a child of an offender is a symptom.
    const set = new Set(past)
    const roots = past.filter((el) => !(el.parentElement && set.has(el.parentElement)))
    return {
      viewportWidth,
      scrollWidth,
      offenders: roots.slice(0, 12).map((el) => {
        const r = el.getBoundingClientRect()
        return { element: describe(el), left: Math.round(r.left), right: Math.round(r.right), text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60) }
      }),
    }
  })
}

export function formatReport(report: OverflowReport): string {
  const head = `viewport ${report.viewportWidth}px, document scrollWidth ${report.scrollWidth}px`
  if (report.offenders.length === 0) return head
  return `${head}\n` + report.offenders.map((o) => `  right edge ${o.right}px (left ${o.left}): ${o.element}  "${o.text}"`).join("\n")
}
