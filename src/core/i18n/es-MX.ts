import type { ShellCopy } from "./copy"

/** Español (México) — the first non-English locale, shipped for Matpro. */
export const esMX: ShellCopy = {
  lang: "es-MX",

  nav: {
    groups: { operate: "Operar", configure: "Configurar", settings: "Ajustes" },
    expandSidebar: "Expandir la barra lateral",
    collapseSidebar: "Contraer la barra lateral",
    openNavigation: "Abrir la navegación",
    openPalette: "Abrir la paleta de comandos",
    theme: "Tema",
    themeModes: {
      light: { title: "Claro", short: "Claro" },
      system: { title: "Sistema", short: "Auto" },
      dark: { title: "Oscuro", short: "Oscuro" },
    },
    logoPlaceholder: "Logo",
    logoAlt: (workspace) => `Logo de ${workspace}`,
    builtBy: "Hecho por",
  },

  search: {
    placeholder: "Buscar pantallas y acciones",
  },

  palette: {
    goTo: "Ir a",
    actions: "Acciones",
    collapseSidebar: "Contraer la barra lateral",
    keyboardShortcuts: "Atajos de teclado",
    switchToDark: "Cambiar a oscuro",
    switchToLight: "Cambiar a claro",
    followSystem: "Seguir el tema del sistema",
  },

  shortcuts: {
    title: "Atajos de teclado",
    anywhere: "En cualquier lugar",
    move: "Navegar",
    commandPalette: "Paleta de comandos",
    shortcuts: "Atajos",
    collapseSidebar: "Contraer la barra lateral",
    closeAnything: "Cerrar lo que esté abierto",
    goThen: (letter) => `G y luego ${letter}`,
    then: "luego",
    footer: "Los atajos se desactivan mientras un campo de texto tiene el foco, excepto Escape.",
  },

  account: {
    profile: "Perfil y cuenta",
    profileUnavailable: "La configuración del perfil aún no está disponible",
    commandPalette: "Paleta de comandos",
    keyboardShortcuts: "Atajos de teclado",
    appearance: "Apariencia",
    signOut: "Cerrar sesión",
  },

  data: {
    loading: "Cargando",
    retry: "Reintentar",
    trace: (id) => `traza ${id}`,
    selectAllRows: "Seleccionar todas las filas",
    selectRow: "Seleccionar fila",
    pagination: "Paginación",
    previousPage: "Página anterior",
    nextPage: "Página siguiente",
    columns: "Columnas",
    shownColumns: "Columnas visibles",
    pinned: "fija",
    resetColumns: "Restablecer",
    matchAll: "Cumplir todas las condiciones",
    clearAll: "Limpiar todo",
    where: "Donde",
    and: "Y",
    filterField: "Campo del filtro",
    filterOperator: "Operador del filtro",
    filterValue: "Valor del filtro",
    removeCondition: "Quitar condición",
    addCondition: "Agregar condición",
    operators: {
      equals: "es",
      not_equals: "no es",
      contains: "contiene",
      is_empty: "está vacío",
      is_not_empty: "no está vacío",
      gte: "al menos",
      lte: "como máximo",
    },
    savedViews: "Vistas guardadas",
    allRecords: "Todos los registros",
    bulkActions: "Acciones en lote",
    clearSelection: "Limpiar la selección",
    // Spanish plurals are irregular; callers pass the singular noun and
    // the locale adds "s" for vowel-final nouns, "es" otherwise.
    selected: (count, noun) => {
      const plural = /[aeiouáéíóú]$/i.test(noun) ? `${noun}s` : `${noun}es`
      return `${count} ${count === 1 ? noun : plural} ${count === 1 ? "seleccionado" : "seleccionados"}`
    },
    recordNoun: "registro",
  },

  forms: {
    unsavedChanges: "Cambios sin guardar",
    saveChanges: "Guardar cambios",
    discard: "Descartar",
    couldNotSave: "No se pudo guardar",
    saving: "Guardando…",
    unsavedEdits: "Ediciones sin guardar en este registro",
    allSaved: "Todos los cambios guardados",
    noChanges: "Sin cambios todavía",
    cancel: "Cancelar",
    typeToConfirm: (word) => `Escribe ${word} para confirmar`,
  },

  errors: {
    title: "Algo salió mal",
    body: "No se pudo cargar la página. No se cambió nada; volver a intentarlo suele resolverlo.",
    startupBody: "La aplicación no pudo iniciar esta página. Volver a intentarlo suele resolverlo.",
    tryAgain: "Intentar de nuevo",
    backHome: "Volver al inicio",
    reference: (digest) => `referencia ${digest}`,
    notAvailableTitle: "No disponible",
    notAvailableBody: "Esta página no existe en este espacio de trabajo, o el módulo al que pertenece no está habilitado.",
    notFoundTitle: "Esta página no existe",
    notFoundBody: "La dirección puede estar mal escrita, o la página pudo haberse movido o desactivado.",
    openApp: "Abrir la aplicación",
  },

  audit: {
    system: "Sistema",
    formerMember: "exmiembro",
    workspaceCreated: (actor, label) => `${actor} creó el espacio de trabajo “${label}”`,
    settingsUpdated: (actor, n) => `${actor} actualizó la configuración del espacio de trabajo (${n} campo${n === 1 ? "" : "s"})`,
    brandingUpdated: (actor) => `${actor} actualizó la identidad visual del espacio de trabajo`,
    memberJoined: (label, role) => `${label} se unió como ${role}`,
    memberAdded: (actor, label, role) => `${actor} agregó a ${label} como ${role}`,
    roleChanged: (actor, label, from, to) => `${actor} cambió el rol de ${label} de ${from} a ${to}`,
    memberRemoved: (actor, label) => `${actor} eliminó a ${label} del espacio de trabajo`,
    invited: (actor, label, role) => `${actor} invitó a ${label} como ${role}`,
    invitationResent: (actor, label) => `${actor} reenvió la invitación de ${label}`,
    invitationRevoked: (actor, label) => `${actor} revocó la invitación de ${label}`,
    invitationAccepted: (label) => `${label} aceptó su invitación`,
    // The action is an English code identifier; splitting it into words
    // would produce fake Spanish prose, so it is shown as the identifier.
    fallback: (actor, action, label) => `${actor} · ${action}${label ? ` · ${label}` : ""}`,
  },
}
