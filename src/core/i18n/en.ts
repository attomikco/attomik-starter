import type { ShellCopy } from "./copy"

/** English — the reference copy, verbatim from design-reference. */
export const en: ShellCopy = {
  lang: "en",

  nav: {
    groups: { operate: "Operate", configure: "Configure", settings: "Settings" },
    expandSidebar: "Expand the sidebar",
    collapseSidebar: "Collapse the sidebar",
    openNavigation: "Open navigation",
    openPalette: "Open command palette",
    theme: "Theme",
    themeModes: {
      light: { title: "Light", short: "Light" },
      system: { title: "System", short: "Auto" },
      dark: { title: "Dark", short: "Dark" },
    },
    logoPlaceholder: "Logo",
    logoAlt: (workspace) => `${workspace} logo`,
    builtBy: "Built by",
  },

  search: {
    placeholder: "Search screens and actions",
  },

  palette: {
    goTo: "Go to",
    actions: "Actions",
    collapseSidebar: "Collapse the sidebar",
    keyboardShortcuts: "Keyboard shortcuts",
    switchToDark: "Switch to dark",
    switchToLight: "Switch to light",
    followSystem: "Follow the system theme",
  },

  shortcuts: {
    title: "Keyboard shortcuts",
    anywhere: "Anywhere",
    move: "Move",
    commandPalette: "Command palette",
    shortcuts: "Shortcuts",
    collapseSidebar: "Collapse the sidebar",
    closeAnything: "Close anything",
    goThen: (letter) => `G then ${letter}`,
    then: "then",
    footer: "Shortcuts are off while a text field has focus, except Escape.",
  },

  account: {
    profile: "Profile and account",
    profileUnavailable: "Profile settings are not available yet",
    commandPalette: "Command palette",
    keyboardShortcuts: "Keyboard shortcuts",
    appearance: "Appearance",
    signOut: "Sign out",
  },

  data: {
    loading: "Loading",
    retry: "Retry",
    trace: (id) => `trace ${id}`,
    selectAllRows: "Select all rows",
    selectRow: "Select row",
    pagination: "Pagination",
    previousPage: "Previous page",
    nextPage: "Next page",
    columns: "Columns",
    shownColumns: "Shown columns",
    pinned: "pinned",
    resetColumns: "Reset to default",
    matchAll: "Match all conditions",
    clearAll: "Clear all",
    where: "Where",
    and: "And",
    filterField: "Filter field",
    filterOperator: "Filter operator",
    filterValue: "Filter value",
    removeCondition: "Remove condition",
    addCondition: "Add condition",
    operators: {
      equals: "is",
      not_equals: "is not",
      contains: "contains",
      is_empty: "is empty",
      is_not_empty: "is not empty",
      gte: "at least",
      lte: "at most",
    },
    savedViews: "Saved views",
    allRecords: "All records",
    bulkActions: "Bulk actions",
    clearSelection: "Clear selection",
    selected: (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"} selected`,
    recordNoun: "record",
  },

  forms: {
    unsavedChanges: "Unsaved changes",
    saveChanges: "Save changes",
    discard: "Discard",
    couldNotSave: "Could not save",
    saving: "Saving…",
    unsavedEdits: "Unsaved edits on this record",
    allSaved: "All changes saved",
    noChanges: "No changes yet",
    cancel: "Cancel",
    typeToConfirm: (word) => `Type ${word} to confirm`,
  },

  errors: {
    title: "Something went wrong",
    body: "The page could not be loaded. Nothing was changed — retrying usually fixes it.",
    startupBody: "The application could not start this page. Retrying usually fixes it.",
    tryAgain: "Try again",
    backHome: "Back to Overview",
    reference: (digest) => `reference ${digest}`,
    notAvailableTitle: "Not available",
    notAvailableBody: "This page does not exist in this workspace, or the module it belongs to is not enabled.",
    notFoundTitle: "This page does not exist",
    notFoundBody: "The address may be mistyped, or the page may have been moved or turned off.",
    openApp: "Open the app",
  },

  audit: {
    system: "System",
    formerMember: "former member",
    workspaceCreated: (actor, label) => `${actor} created the workspace “${label}”`,
    settingsUpdated: (actor, n) => `${actor} updated workspace settings (${n} field${n === 1 ? "" : "s"})`,
    brandingUpdated: (actor) => `${actor} updated the workspace branding`,
    memberJoined: (label, role) => `${label} joined as ${role}`,
    memberAdded: (actor, label, role) => `${actor} added ${label} as ${role}`,
    roleChanged: (actor, label, from, to) => `${actor} changed ${label}’s role from ${from} to ${to}`,
    memberRemoved: (actor, label) => `${actor} removed ${label} from the workspace`,
    invited: (actor, label, role) => `${actor} invited ${label} as ${role}`,
    invitationResent: (actor, label) => `${actor} resent the invitation for ${label}`,
    invitationRevoked: (actor, label) => `${actor} revoked the invitation for ${label}`,
    invitationAccepted: (label) => `${label} accepted their invitation`,
    // English identifiers read as prose once the dots and underscores go:
    // "media.file.uploaded" → "actor — media file uploaded — label"
    fallback: (actor, action, label) => {
      const words = action.split(".").join(" ").split("_").join(" ")
      return `${actor} — ${words}${label ? ` — ${label}` : ""}`
    },
  },
}
