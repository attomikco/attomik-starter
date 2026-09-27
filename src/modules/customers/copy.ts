// Relative .ts import keeps this module runnable under `node --test`.
import { defineCopy } from "../../core/i18n/t.ts"

/** Customers module copy. English is the source; es-MX follows sentence case. */
export const customersCopy = defineCopy({
  en: {
    "customers.placeholder.title": "Customers Module",
    "customers.placeholder.body": "Placeholder — the real customers table ports in a later task.",
  },
  "es-MX": {
    "customers.placeholder.title": "Módulo de clientes",
    "customers.placeholder.body": "Marcador de posición: la tabla real de clientes se incorpora en una tarea posterior.",
  },
})
