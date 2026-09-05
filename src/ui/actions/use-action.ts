"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useCopy } from "@/core/i18n/client"
import { useToast } from "@/ui/shell/toast-provider"

/**
 * The canonical way a screen runs a server action: toast the outcome, and
 * on success re-read the server data. Two rules a hand-rolled copy is easy
 * to get wrong, and both matter more as actions get slower:
 *
 *  - BUSY IS KEYED. A single boolean means one in-flight request disables
 *    every control on the screen; a slow action (an invite send, a
 *    generation call) would freeze every other row's actions at once.
 *    `busy(key)` is true only for the work that key names, and `busy()`
 *    with no key is true while anything is running.
 *  - A THROWN ACTION IS AN OUTCOME. Without a catch, a network failure or
 *    a crash inside a server action leaves the screen disabled forever
 *    with no message. Here it toasts and clears, like any other failure.
 *
 * Modules pass their own already-localized messages; the only string this
 * hook owns is the fallback for a throw, which no action authored.
 */

export interface ActionOutcome<T = undefined> {
  ok: boolean
  message?: string
  data?: T
}

export interface ActionRunner {
  /**
   * Runs `fn`, toasts `okMessage` or the action's own message, refreshes
   * the route on success, and returns the outcome so the caller can read
   * `data`. A throw becomes `{ ok: false }` rather than a wedged screen.
   */
  run: <T>(key: string, fn: () => Promise<ActionOutcome<T>>, okMessage: string) => Promise<ActionOutcome<T>>
  /** In flight for this key, or for anything when called with no key. */
  busy: (key?: string) => boolean
}

export function useAction(): ActionRunner {
  const router = useRouter()
  const { say } = useToast()
  const copy = useCopy()
  const [running, setRunning] = useState<readonly string[]>([])
  // The toast and refresh callbacks are stable enough to read through a ref,
  // so `run` keeps a stable identity and never re-triggers a caller's effects.
  const latest = useRef({ say, router, copy })
  latest.current = { say, router, copy }

  const run = useCallback(async <T,>(key: string, fn: () => Promise<ActionOutcome<T>>, okMessage: string): Promise<ActionOutcome<T>> => {
    setRunning((keys) => keys.concat(key))
    try {
      const result = await fn()
      // A successful action can still override the toast (e.g. an action
      // recording an event that then failed to deliver downstream) —
      // result.message wins over the caller's static okMessage when present;
      // every other action leaves it unset, so this is a no-op for them.
      latest.current.say(result.ok ? (result.message ?? okMessage) : (result.message ?? latest.current.copy.forms.couldNotSave))
      if (result.ok) latest.current.router.refresh()
      return result
    } catch (error) {
      console.error(`[action] ${key} threw:`, error)
      latest.current.say(latest.current.copy.forms.couldNotSave)
      return { ok: false }
    } finally {
      setRunning((keys) => {
        const at = keys.indexOf(key)
        return at < 0 ? keys : keys.slice(0, at).concat(keys.slice(at + 1))
      })
    }
  }, [])

  const busy = useCallback((key?: string) => (key === undefined ? running.length > 0 : running.includes(key)), [running])

  return { run, busy }
}
