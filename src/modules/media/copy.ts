// Relative .ts import keeps this module runnable under `node --test`.
import { defineCopy } from "../../core/i18n/t.ts"

/** Media module copy. English is the source; es-MX follows sentence case. */
export const mediaCopy = defineCopy({
  en: {
    "media.placeholder.title": "Media Module",
    "media.placeholder.body": "Placeholder — the real media library ports in a later task.",
  },
  "es-MX": {
    "media.placeholder.title": "Módulo de medios",
    "media.placeholder.body": "Marcador de posición: la biblioteca real de medios se incorpora en una tarea posterior.",
  },
})
