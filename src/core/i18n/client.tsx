"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { createFormatters, type Formatters } from "./format"
import type { Locale } from "./locales"
import type { ModuleCopy, Translator } from "./t"
import { defaultLocale, defaultTimeZone, resolveCopy, type ShellCopy } from "./index"

/**
 * Client side of the active locale. The root layout resolves the user's
 * locale on the server and mounts `LocaleProvider` with it, so the first
 * render (SSR and hydration alike) is already in the right language — the
 * same server-first rule branding follows. Outside a provider (the global
 * error boundary, which replaces the root layout) the project default
 * applies.
 */

const LocaleContext = createContext<{ locale: Locale; timeZone: string } | null>(null)

export function LocaleProvider({ locale, timeZone, children }: { locale: Locale; timeZone: string; children: ReactNode }) {
  return <LocaleContext.Provider value={{ locale, timeZone }}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)?.locale ?? defaultLocale
}

/** The workspace time zone (project default outside a provider). */
export function useTimeZone(): string {
  return useContext(LocaleContext)?.timeZone ?? defaultTimeZone
}

/** The shell dictionary for the active locale. */
export function useCopy(): ShellCopy {
  return resolveCopy(useLocale())
}

/** A module's translator for the active locale. */
export function useT(copy: ModuleCopy): Translator {
  const locale = useLocale()
  return useMemo(() => copy.for(locale), [copy, locale])
}

/** Date and number formatters for the active locale in the workspace zone. */
export function useFormat(timeZone?: string): Formatters {
  const locale = useLocale()
  const workspaceZone = useTimeZone()
  const zone = timeZone ?? workspaceZone
  return useMemo(() => createFormatters(locale, zone), [locale, zone])
}
