import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { getServerStatus, type ServerStatus } from '../api/server'
import {
  ServerStatusContext,
  type Connectivity,
  type ServerStatusValue,
} from './serverStatus'

const POLL_INTERVAL_MS = 5000

/**
 * Single source of truth for server state. Every page that needs the
 * current status reads this instead of running its own poller, so the
 * panel issues one request per interval no matter how many consumers
 * are mounted. Polling pauses while the tab is hidden and resumes on
 * focus.
 */
export default function ServerStatusProvider({
  children,
}: {
  children: ReactNode
}) {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  // Requests run one at a time so an out-of-order response can never
  // overwrite newer state, and a queued call always fetches fresh data.
  const queue = useRef<Promise<void>>(Promise.resolve())
  const busy = useRef(false)

  const runRequest = useCallback(async () => {
    busy.current = true

    try {
      const data = await getServerStatus()

      setStatus(data)
      setError(null)
      setLastUpdated(Date.now())
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught
          : new Error('Failed to reach the server API'),
      )
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    const next = queue.current.then(runRequest)

    // runRequest never rejects, so this chain cannot break.
    queue.current = next

    return next
  }, [runRequest])

  /** Interval ticks are dropped while a request is still outstanding. */
  const poll = useCallback(() => {
    if (busy.current) {
      return
    }

    void refresh()
  }, [refresh])

  useEffect(() => {
    void refresh()

    const timer = window.setInterval(() => {
      // Skip polling while the tab is in the background; the
      // visibility handler refreshes as soon as it comes back.
      if (document.visibilityState === 'visible') {
        poll()
      }
    }, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        poll()
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.clearInterval(timer)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [refresh, poll])

  // Derived from the *current* request outcome, not from "has ever
  // succeeded" — otherwise an outage after a good first response would
  // keep reporting the server as online from stale data.
  const connectivity = useMemo<Connectivity>(() => {
    if (error !== null) {
      return 'unreachable'
    }

    if (status === null) {
      return 'connecting'
    }

    return status.running ? 'online' : 'offline'
  }, [error, status])

  const value = useMemo<ServerStatusValue>(
    () => ({
      status,
      error,
      loading,
      lastUpdated,
      connectivity,
      refresh,
    }),
    [
      status,
      error,
      loading,
      lastUpdated,
      connectivity,
      refresh,
    ],
  )

  return (
    <ServerStatusContext.Provider value={value}>
      {children}
    </ServerStatusContext.Provider>
  )
}
