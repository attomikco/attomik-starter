/**
 * In-page layout checks for the UI audit (docs/UI_AUDIT.md). One function,
 * serialised into the page by Playwright, so it must stay self-contained:
 * no imports, no closures over the spec. It returns offenders as short
 * strings; the spec turns them into a per-route report.
 */

export interface LayoutCheckOptions {
  /** Check that the main content fills ≥ `minContentRatio` of the screen host (desktop widths only). */
  checkContentWidth: boolean
  minContentRatio: number
  /** Source of the "1 <plural>" regex (its flags are fixed to "u"). */
  onePluralSource: string
  markdownSource: string
}

export interface LayoutReport {
  overlaps: string[]
  clipped: string[]
  narrowContent: string | null
  badStrings: string[]
  segmentedWraps: string[]
}

export function layoutChecks(opts: LayoutCheckOptions): LayoutReport {
  const report: LayoutReport = { overlaps: [], clipped: [], narrowContent: null, badStrings: [], segmentedWraps: [] }
  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase()
    const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : ""
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40)
    return `<${tag}${id}> "${text}"`
  }
  const visible = (el: Element): boolean => {
    const cs = getComputedStyle(el)
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const hiddenAncestor = (el: Element): boolean => {
    for (let n: Element | null = el; n; n = n.parentElement) {
      if (n.getAttribute("aria-hidden") === "true") return true
      const cs = getComputedStyle(n)
      if (cs.display === "none" || cs.visibility === "hidden") return true
    }
    return false
  }
  const inOverlay = (el: Element): boolean => {
    for (let n: Element | null = el; n; n = n.parentElement) {
      const p = getComputedStyle(n).position
      if (p === "fixed" || p === "sticky") return true
      if (n.hasAttribute("data-allow-overlap")) return true
    }
    return false
  }

  // ---- Overlapping text: leaf text nodes whose VISIBLE boxes intersect.
  // A box is cut down to every clipping ancestor (overflow other than
  // visible): text scrolled or clipped away inside a list, a table wrapper
  // or a truncating cell does not overlap what covers it. Text inside a
  // closed <details> (outside its <summary>) is not rendered at all.
  type Box = { el: Element; x1: number; y1: number; x2: number; y2: number }
  const clipTo = (el: Element, r: { left: number; top: number; right: number; bottom: number }) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom
    for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const clips = (v: string) => v !== "visible"
      if (clips(cs.overflowX) || clips(cs.overflowY)) {
        const b = n.getBoundingClientRect()
        if (clips(cs.overflowX)) { x1 = Math.max(x1, b.left); x2 = Math.min(x2, b.right) }
        if (clips(cs.overflowY)) { y1 = Math.max(y1, b.top); y2 = Math.min(y2, b.bottom) }
      }
    }
    return { x1, y1, x2, y2 }
  }
  const inClosedDetails = (el: Element): boolean => {
    const details = el.closest("details:not([open])")
    return !!details && !el.closest("summary")
  }
  const boxes: Box[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").trim()
    const el = node.parentElement
    if (!text || !el || hiddenAncestor(el) || inOverlay(el) || inClosedDetails(el)) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 2 || r.height < 2) continue
      const c = clipTo(el, r)
      if (c.x2 - c.x1 < 2 || c.y2 - c.y1 < 2) continue
      boxes.push({ el, ...c })
    }
  }
  const related = (a: Element, b: Element) => a === b || a.contains(b) || b.contains(a)
  const seen = new Set<string>()
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      if (related(a.el, b.el)) continue
      const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
      const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)
      if (w > 2 && h > 2 && w * h > 12) {
        const key = describe(a.el) + "|" + describe(b.el)
        if (!seen.has(key)) { seen.add(key); report.overlaps.push(`${describe(a.el)} overlaps ${describe(b.el)}`) }
      }
    }
  }

  // ---- Clipped text: overflow hidden with content wider than the box, and no ellipsis+title.
  const hasTitle = (el: Element): boolean => {
    for (let n: Element | null = el; n; n = n.parentElement) if (n.getAttribute("title") || n.getAttribute("aria-label")) return true
    return false
  }
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    if (!el.textContent?.trim() || !visible(el) || hiddenAncestor(el)) continue
    const cs = getComputedStyle(el)
    const clipsX = (cs.overflowX === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 1
    if (!clipsX) continue
    if (el.closest("[data-allow-overflow]")) continue
    // Only the innermost clipper with text of its own counts; a card clipping a scroll strip is not clipped text.
    if (Array.from(el.children).some((c) => { const ccs = getComputedStyle(c); return ccs.overflowX === "auto" || ccs.overflowX === "scroll" })) continue
    const ellipsis = cs.textOverflow === "ellipsis"
    if (ellipsis && hasTitle(el)) continue
    report.clipped.push(`${describe(el)} scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}${ellipsis ? " (ellipsis without title)" : ""}`)
    if (report.clipped.length >= 12) break
  }

  // ---- Main content width vs the screen host.
  if (opts.checkContentWidth) {
    const host = document.querySelector<HTMLElement>(".sh-screen-host")
    const root = host?.querySelector<HTMLElement>("[data-page-root], .sh-scroll")
    if (host && root) {
      const inner = host.clientWidth
      const kids = Array.from(root.children).filter((c) => visible(c) && getComputedStyle(c).position !== "absolute" && getComputedStyle(c).position !== "fixed")
      if (kids.length) {
        let left = Infinity, right = -Infinity
        for (const k of kids) { const r = k.getBoundingClientRect(); left = Math.min(left, r.left); right = Math.max(right, r.right) }
        const hostRect = host.getBoundingClientRect()
        const available = inner - 52 // the page container's own 26px gutters
        const used = right - left
        if (used < available * opts.minContentRatio) report.narrowContent = `content ${Math.round(used)}px of ${Math.round(available)}px available (${Math.round((used / available) * 100)}%) in host ${Math.round(hostRect.width)}px`
      }
    }
  }

  // ---- Strings: "1 <plural>" and raw markdown in visible text.
  const text = document.body.innerText ?? ""
  const onePlural = new RegExp(opts.onePluralSource, "u")
  const md = new RegExp(opts.markdownSource, "u")
  const m1 = text.match(onePlural)
  if (m1) report.badStrings.push(`count of one with a plural: "${m1[0].trim()}"`)
  const m2 = text.match(md)
  if (m2) report.badStrings.push(`raw markdown in text: "${m2[0].trim().slice(0, 60)}"`)

  // ---- Segmented controls whose options wrap onto more than one line.
  for (const group of Array.from(document.querySelectorAll<HTMLElement>("[data-segmented]"))) {
    if (!visible(group)) continue
    const tops = new Set(Array.from(group.querySelectorAll<HTMLElement>("button")).map((b) => Math.round(b.offsetTop)))
    if (tops.size > 1) report.segmentedWraps.push(`${describe(group)} wraps onto ${tops.size} lines`)
  }

  return report
}
