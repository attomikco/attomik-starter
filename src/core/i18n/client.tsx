"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { createFormatters, type Formatters } from "./format"
import type { Locale } from "./locales"
import type { ModuleCopy, Translator } from "./t"
import { defaultLocale, resolveCopy, type ShellCopy } from "./index"

/**
 * Client side of the active locale. The root layout resolves the user's
 * locale on the server and mounts `LocaleProvider` with it, so the first
 * render (SSR and hydration alike) is already in the right language — the
 * same server-first rule branding follows. Outside a provider (the global
 * error boundary, which replaces the root layout) the project default
 * applies.
 */

const LocaleContext = createContext<Locale | null>(null)

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext) ?? defaultLocale
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

/** Date and number formatters for the active locale. */
export function useFormat(timeZone?: string): Formatters {
  const locale = useLocale()
  return useMemo(() => createFormatters(locale, timeZone), [locale, timeZone])
}
