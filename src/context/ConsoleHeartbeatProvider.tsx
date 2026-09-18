import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  classifyHeartbeatDetail,
  findHeartbeatJob,
  getScheduler,
  type HeartbeatState,
  type ScheduleJob,
} from '../api/operations'
import {
  ConsoleHeartbeatContext,
  type ConsoleHeartbeatValue,
} from './consoleHeartbeat'

const POLL_INTERVAL_MS = 60_000

/**
 * Watches the backend's log-pipeline heartbeat so the Dashboard can warn
 * when the panel has gone blind. The heartbeat job reports success even
 * when the pipeline is stalled, so the state is derived from
 * `last_detail` rather than `last_status`.
 */
export default function ConsoleHeartbeatProvider({
  children,
}: {
  children: ReactNode
}) {
  const [job, setJob] = useState<ScheduleJob | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const scheduler = await getScheduler()

      setJob(findHeartbeatJob(scheduler))
    } catch {
      // Keep the last known job. Clearing it would make a transient
      // scheduler failure silently retract an active stall alert, which
      // is the one signal this provider exists to raise. An older backend
      // simply never populates `job`, which stays "unknown" and quiet.
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

  // A backend without a heartbeat job never populates `job`, which maps
  // to "unknown" and therefore stays quiet.
  const state: HeartbeatState = useMemo(
    () =>
      job === null
        ? 'unknown'
        : classifyHeartbeatDetail(job.last_detail),
    [job],
  )

  const value = useMemo<ConsoleHeartbeatValue>(
    () => ({
      state,
      detail: job?.last_detail ?? '',
      loading,
      refresh,
    }),
    [state, job, loading, refresh],
  )

  return (
    <ConsoleHeartbeatContext.Provider value={value}>
      {children}
    </ConsoleHeartbeatContext.Provider>
  )
}
