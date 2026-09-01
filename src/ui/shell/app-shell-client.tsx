"use client"

import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { projectConfig } from "@/config/project"
import type { NavigationGroup } from "@/core/navigation"
import { CommandBar, type ShellPanel } from "./command-bar"
import type { ShellAccount } from "./app-shell"
import { CommandPalette } from "./command-palette"
import { buildGoMap, isNavActive, isTypingTarget, type PaletteGroup } from "./helpers"
import { MobileBar } from "./mobile-bar"
import { ShortcutsDialog } from "./shortcuts-dialog"
import { Sidebar } from "./sidebar"
import { ThemeProvider, useTheme } from "./theme"
import { ToastProvider } from "./toast-provider"
import "./shell.css"

/**
 * Client shell orchestration, ported from the reference host renderVals()
 * and keyboard layer. Navigation data arrives serialized from the server
 * wrapper (app-shell.tsx) — the registry stays the single source of truth.
 */

const COLLAPSE_KEY = "attomik-rail-collapsed"
const MOBILE_BREAKPOINT = 900 // reference: mobile = vw < 900

export function AppShellClient({
  navigation,
  chrome = "full",
  account,
  children,
}: {
  navigation: NavigationGroup[]
  chrome?: "inset" | "full"
  account: ShellAccount
  children: ReactNode
}) {
  return (
    <ThemeProvider>
      <ShellInner navigation={navigation} chrome={chrome} account={account}>{children}</ShellInner>
    </ThemeProvider>
  )
}

function ShellInner({ navigation, chrome, account, children }: { navigation: NavigationGroup[]; chrome: "inset" | "full"; account: ShellAccount; children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setMode } = useTheme()

  const [vw, setVw] = useState(1440)
  const [collapsed, setCollapsed] = useState(false)
  const [railOpen, setRailOpen] = useState(false)
  const [panel, setPanel] = useState<ShellPanel>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [goArmed, setGoArmed] = useState(false)

  const mobile = vw < MOBILE_BREAKPOINT
  const tight = collapsed && !mobile
  const full = chrome === "full"

  const navItems = useMemo(() => navigation.flatMap((g) => g.items), [navigation])
  const goMap = useMemo(() => buildGoMap(navItems), [navItems])
  const screenLabel = navItems.find((i) => isNavActive(pathname, i.href))?.label ?? projectConfig.name

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true)
    } catch {}
    const onResize = () => setVw(window.innerWidth)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1") } catch {}
      return !c
    })
  }, [])

  const goto = useCallback((href: string) => {
    setRailOpen(false)
    setPanel(null)
    setPaletteOpen(false)
    router.push(href)
  }, [router])

  // Keyboard layer, ported from the reference host _onKey.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = isTypingTarget(target?.tagName ?? "", !!target?.isContentEditable)
      const k = String(e.key).toLowerCase()
      if (e.key === "Escape") {
        setPaletteOpen(false); setKeysOpen(false); setPanel(null); setRailOpen(false); setGoArmed(false)
        return
      }
      if (e.metaKey || e.ctrlKey) {
        if (k === "k") { e.preventDefault(); setPaletteOpen((o) => !o); setKeysOpen(false) }
        if (k === "/") { e.preventDefault(); setKeysOpen((o) => !o); setPaletteOpen(false) }
        if (k === "b") { e.preventDefault(); toggleCollapse() }
        return
      }
      if (typing) return
      if (goArmed) {
        setGoArmed(false)
        const dest = goMap[k]
        if (dest) { e.preventDefault(); goto(dest.href) }
        return
      }
      if (k === "g" && Object.keys(goMap).length > 0) {
        setGoArmed(true)
        window.setTimeout(() => setGoArmed(false), 1400)
        return
      }
      if (k === "?") { e.preventDefault(); setKeysOpen(true) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goArmed, goMap, goto, toggleCollapse])

  const paletteGroups: PaletteGroup[] = useMemo(() => [
    {
      label: "Go to",
      items: navItems.map((i) => ({ label: i.label, run: () => goto(i.href) })),
    },
    {
      label: "Actions",
      items: [
        { label: "Collapse the sidebar", run: () => { toggleCollapse(); setPaletteOpen(false) } },
        { label: "Keyboard shortcuts", run: () => { setKeysOpen(true); setPaletteOpen(false) } },
        { label: "Switch to dark", run: () => { setMode("dark"); setPaletteOpen(false) } },
        { label: "Switch to light", run: () => { setMode("light"); setPaletteOpen(false) } },
        { label: "Follow the system theme", run: () => { setMode("system"); setPaletteOpen(false) } },
      ],
    },
  ], [navItems, goto, toggleCollapse, setMode])

  const goHint = Object.entries(goMap).map(([letter, d]) => `${letter.toUpperCase()} ${d.label.toLowerCase()}`).join(" · ")
  const goRows: [string, string][] = Object.entries(goMap).map(([letter, d]) => [d.label, `G then ${letter.toUpperCase()}`])

  const pageStyle: CSSProperties = {
    width: "100%", ...(full ? {} : { maxWidth: 1440 }), margin: "0 auto", height: "100vh",
    padding: full ? 0 : mobile ? 10 : 26, boxSizing: "border-box",
    display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden", position: "relative",
  }

  const shellStyle: CSSProperties = {
    background: "var(--shell)", borderRadius: full ? 0 : mobile ? 20 : 30,
    padding: full ? 0 : mobile ? 10 : 16, display: "flex", gap: full ? 0 : 16,
    flex: 1, minHeight: 0, boxSizing: "border-box", overflow: "hidden", position: "relative",
  }

  return (
    <div style={pageStyle}>
      <ToastProvider>
        <div style={shellStyle}>
          {(!mobile || railOpen) && (
            <Sidebar
              navigation={navigation}
              mobile={mobile}
              tight={tight}
              chromeFull={full}
              onToggleCollapse={toggleCollapse}
              onNavigate={() => { setRailOpen(false); setPanel(null) }}
            />
          )}

          {mobile && railOpen && (
            <div style={{ position: "absolute", inset: 0, zIndex: 45, background: "rgba(8,10,14,.34)" }} onClick={() => setRailOpen(false)} />
          )}

          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {mobile ? (
              <MobileBar
                screenLabel={screenLabel}
                panel={panel}
                setPanel={setPanel}
                openRail={() => setRailOpen(true)}
                openPalette={() => { setPaletteOpen(true); setPanel(null) }}
              />
            ) : (
              <CommandBar
                account={account}
                panel={panel}
                setPanel={setPanel}
                openPalette={() => { setPaletteOpen(true); setPanel(null) }}
                openKeys={() => { setPanel(null); setKeysOpen(true) }}
              />
            )}

            <div style={{ flex: 1, minHeight: 0, position: "relative", background: "var(--card)", borderRadius: full ? 0 : "var(--r)", overflow: "hidden" }}>
              {children}
            </div>
          </div>
        </div>

        {goArmed && goHint && (
          <div style={{ position: "absolute", left: "50%", bottom: 32, transform: "translateX(-50%)", zIndex: 97, display: "flex", alignItems: "center", gap: 10, background: "var(--txt)", borderRadius: 999, padding: "10px 18px", boxShadow: "0 18px 40px rgba(0,0,0,.24)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--card)" }}>G</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--line-2)" }}>then</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--card)" }}>{goHint}</span>
          </div>
        )}

        {keysOpen && <ShortcutsDialog goRows={goRows} onClose={() => setKeysOpen(false)} />}
        {paletteOpen && <CommandPalette groups={paletteGroups} mobile={mobile} onClose={() => setPaletteOpen(false)} />}
      </ToastProvider>
    </div>
  )
}
