import type { NavGroup } from "@/core/modules/registry"

/**
 * The shell-chrome dictionary: every fixed, user-facing string the shell,
 * the canonical data primitives, the app-level error/404 states, and the
 * audit summarizer render. Modules own their own copy; the registry's
 * navigation labels are module definitions and stay where they are.
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
