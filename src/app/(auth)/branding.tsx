"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * Carries the server-resolved auth branding (workspace name + the logo for
 * the auth surface's ground) into the client auth screens, so the card
 * header can render the real mark without fetching. Values come from
 * getAuthBranding() in the (auth) layout.
 */
export interface AuthBrandingValue {
  name: string
  logoUrl: string | null
}

const AuthBrandingContext = createContext<AuthBrandingValue>({ name: "", logoUrl: null })

export function AuthBrandingProvider({ value, children }: { value: AuthBrandingValue; children: ReactNode }) {
  return <AuthBrandingContext.Provider value={value}>{children}</AuthBrandingContext.Provider>
}

export function useAuthBranding(): AuthBrandingValue {
  return useContext(AuthBrandingContext)
}
