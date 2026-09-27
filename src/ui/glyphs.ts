/**
 * The only untranslated text the UI renders: typographic symbols and
 * keyboard key legends (docs/I18N.md, "What is NOT localized"). An
 * icon-only control carries a translated aria-label; its glyph is
 * decoration. Anything that reads as words belongs in a dictionary —
 * never add it here.
 */
export const glyph = {
  close: "✕",
  caret: "▾",
  separator: "·",
  arrow: "→",
  up: "↑",
  more: "⋮",
  required: "*",
} as const

/** Key caps as printed on the keyboard; the actions they trigger are copy. */
export const keyLegend = {
  commandPalette: "⌘K",
  escape: "ESC",
  go: "G",
} as const
