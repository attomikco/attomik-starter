import type { NavGroup } from "@/core/modules/registry"

/**
 * The shell dictionary: every fixed, user-facing string the shell, the
 * canonical data primitives, the auth surface, the app-level error/404
 * states, the audit summarizer, and the core emails render. Navigation
 * names live here too (`nav.modules`), resolved when navigation is built,
 * so the registry stays identifiers. Modules own their own copy (copy.ts).
 *
 * Interpolated strings are functions, so each locale controls word order.
 * Both dictionaries must satisfy this interface exactly — the i18n test
 * verifies key parity so a locale can never fall back to English silently.
 */
export interface ShellCopy {
  /** BCP 47 tag rendered on <html lang>. */
  lang: string

  nav: {
    groups: Record<NavGroup, string>
    /**
     * On-screen name and one-line description per registry module id, plus
     * child-row labels keyed by `children[].key`. Resolved when navigation
     * is built; the registry itself holds identifiers only.
     */
    modules: Record<string, { label: string; description: string; children?: Record<string, string> }>
    expandSidebar: string
    collapseSidebar: string
    openNavigation: string
    openPalette: string
    theme: string
    themeModes: Record<"light" | "system" | "dark", { title: string; short: string }>
    logoPlaceholder: string
    logoAlt: (workspace: string) => string
    builtBy: string
  }

  search: {
    placeholder: string
  }

  palette: {
    goTo: string
    actions: string
    collapseSidebar: string
    keyboardShortcuts: string
    switchToDark: string
    switchToLight: string
    followSystem: string
  }

  shortcuts: {
    title: string
    anywhere: string
    move: string
    commandPalette: string
    shortcuts: string
    collapseSidebar: string
    closeAnything: string
    /** "G then O" — the key sequence shown for a jump row. */
    goThen: (letter: string) => string
    /** The connective in the armed-G hint pill: G <then> O overview. */
    then: string
    footer: string
  }

  account: {
    profile: string
    profileUnavailable: string
    commandPalette: string
    keyboardShortcuts: string
    appearance: string
    signOut: string
  }

  /** The canonical data states + table primitives (src/ui/data). */
  data: {
    loading: string
    retry: string
    trace: (id: string) => string
    selectAllRows: string
    selectRow: string
    pagination: string
    previousPage: string
    nextPage: string
    columns: string
    shownColumns: string
    pinned: string
    resetColumns: string
    matchAll: string
    clearAll: string
    where: string
    and: string
    filterField: string
    filterOperator: string
    filterValue: string
    removeCondition: string
    addCondition: string
    operators: Record<"equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty" | "gte" | "lte", string>
    savedViews: string
    allRecords: string
    bulkActions: string
    clearSelection: string
    /** "3 records selected" — count, singular noun. */
    selected: (count: number, noun: string) => string
    recordNoun: string
    pageEmpty: string
    /** "Showing 1–25 of 1,204" — total arrives already number-formatted. */
    pageRange: (start: number, end: number, total: string) => string
  }

  /** SaveBar + ConfirmDialog defaults (src/ui/forms, src/ui/records). */
  forms: {
    unsavedChanges: string
    saveChanges: string
    discard: string
    couldNotSave: string
    saving: string
    unsavedEdits: string
    allSaved: string
    noChanges: string
    cancel: string
    typeToConfirm: (word: string) => string
  }

  /** App-level recoverable error, in-app 404, root 404, fatal boundary. */
  errors: {
    title: string
    body: string
    startupBody: string
    tryAgain: string
    backHome: string
    reference: (digest: string) => string
    notAvailableTitle: string
    notAvailableBody: string
    notFoundTitle: string
    notFoundBody: string
    openApp: string
  }

  audit: AuditCopy

  /** Role identifiers stay English in code and the database; these are their on-screen names. */
  roles: {
    labels: Record<"owner" | "admin" | "member" | "viewer", string>
    meanings: Record<"owner" | "admin" | "member" | "viewer", string>
  }

  /** Landing page for a fresh workspace. */
  overview: {
    eyebrow: string
    intro: string
    links: Record<"appearance" | "team" | "activity", { title: string; body: string }>
  }

  /** The magic-link auth surface and its validation messages. */
  auth: {
    facts: { singleUse: string; expires: string; session: string; logged: string }
    logoPlaceholder: string
    /** Keyed by the validation code returned from validateEmail(). */
    emailErrors: Record<"empty" | "missing_at" | "spaces" | "dotless_domain" | "incomplete", string>
    rateLimited: string
    genericError: string
    login: {
      step1: string
      step2: string
      title: string
      intro: string
      emailLabel: string
      emailPlaceholder: string
      submit: string
      submitting: string
      or: string
      sso: string
      ssoUnavailable: string
      /** Sentence around the two links: [before terms, between, after privacy]. */
      terms: () => [string, string, string]
      termsWord: string
      privacyWord: string
      sentTitle: string
      /** Sentence around the address: [before, after]. */
      sentIntro: () => [string, string]
      nothingArrived: string
      resend: string
      resendIn: (seconds: number) => string
      tipSpam: string
      tipSender: string
      tipFilters: string
      tipDevice: string
      useAnother: string
    }
    verify: { step: string; title: string; intro: string; lines: [string, string, string] }
    expired: { step: string; title: string; intro: string; bannerTitle: string; bannerBody: string; newLink: string; changeAddress: string }
    invite: {
      step: string
      join: (workspace: string) => string
      invitedAs: (role: string) => [string, string]
      accept: string
      onceNote: string
      openApp: string
      errors: Record<"invalid" | "expired" | "revoked" | "accepted" | "wrong_email" | "error", { title: string; body: string }>
    }
  }

  /** Core transactional emails (the invitation; auth mail is Supabase's). */
  email: {
    invitation: {
      subject: (inviter: string, workspace: string) => string
      title: (workspace: string) => string
      /** `inviter` and `role` arrive pre-formatted (plain text or markup). */
      body: (inviter: string, role: string) => string
      accept: string
      fallback: string
      /** `inviter` and `workspace` arrive pre-escaped. */
      footer: (days: number, inviter: string, workspace: string) => string
      textIntro: (inviter: string, workspace: string, role: string) => string
      textAccept: (url: string) => string
    }
  }
}

/** Human summaries for activity events — see src/core/audit/summaries.ts. */
export interface AuditCopy {
  system: string
  formerMember: string
  workspaceCreated: (actor: string, label: string) => string
  settingsUpdated: (actor: string, fieldCount: number) => string
  brandingUpdated: (actor: string) => string
  memberJoined: (label: string, role: string) => string
  memberAdded: (actor: string, label: string, role: string) => string
  roleChanged: (actor: string, label: string, from: string, to: string) => string
  memberRemoved: (actor: string, label: string) => string
  invited: (actor: string, label: string, role: string) => string
  invitationResent: (actor: string, label: string) => string
  invitationRevoked: (actor: string, label: string) => string
  invitationAccepted: (label: string) => string
  /**
   * Unknown (module) actions. The action is a code identifier
   * (`media.file.uploaded`) — English words — so each locale decides
   * whether it reads as prose or is shown as the identifier it is.
   */
  fallback: (actor: string, action: string, label: string | null) => string
}
