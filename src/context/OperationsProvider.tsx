import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getOperations, type Operation } from '../api/world'
import {
  EXCLUSIVE_OPERATION_KINDS,
  OperationsContext,
  isRunning,
  type OperationsValue,
} from './operations'

const POLL_INTERVAL_MS = 4000

/**
 * Polls `GET /api/v1/operations` for the whole panel. This is what makes
 * an in-flight operation survive a page reload, and what lets the restart /
 * switch-world / config actions disable themselves instead of letting the
 * user discover the 409 by clicking.
 */
export default function OperationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await getOperations()

      setOperations(response.operations)
      setError(null)
    } catch (caught) {
      // Operations live in API-process memory; a failed poll just means we
      // cannot tell right now. Keep the previous list rather than blanking
      // the tab, and do not block any action on it — but record the failure
      // so the history view can say the list is unknown instead of claiming
      // it is simply empty.
      setError(
        caught instanceof Error
          ? caught
          : new Error('Failed to load operations'),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh()
    }, 0)

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [refresh])

  const activeExclusive = useMemo(
    () =>
      operations.find(
        (operation) =>
          isRunning(operation) &&
          EXCLUSIVE_OPERATION_KINDS.has(operation.kind),
      ) ?? null,
    [operations],
  )

  const value = useMemo<OperationsValue>(
    () => ({ operations, activeExclusive, loading, error, refresh }),
    [operations, activeExclusive, loading, error, refresh],
  )

  return (
    <OperationsContext.Provider value={value}>
      {children}
    </OperationsContext.Provider>
  )
}
