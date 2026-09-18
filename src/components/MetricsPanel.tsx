import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Cpu,
  HardDrive,
  LineChart,
  MemoryStick,
  RefreshCw,
  Users,
} from 'lucide-react'

import { ApiError } from '../api/client'
import {
  getMetrics,
  METRICS_WINDOWS,
  METRICS_WINDOW_LABELS,
  type MetricsResponse,
  type MetricsSample,
  type MetricsWindow,
} from '../api/metrics'
import { useServerStatus } from '../context/serverStatus'
import TrendChart from './TrendChart'

/**
 * One sample per minute is all the backend keeps (and the default
 * `METRICS_INTERVAL_SECONDS`), so refreshing faster than that would only
 * re-download the same points. The 5s status poller is deliberately not
 * reused here.
 */
const POLL_INTERVAL_MS = 60000

interface MetricsState {
  /** The window the data/error below belongs to. */
  window: MetricsWindow
  data: MetricsResponse | null
  error: string | null
}

/**
 * Resource and player-count trends from `GET /api/v1/metrics`
 * (API 2.0.0+, capability `server.metrics`). Dashboard renders this only
 * when the capability is advertised, so an older backend never issues a
 * request that would 404.
 */
export default function MetricsPanel() {
  const [windowMinutes, setWindowMinutes] =
    useState<MetricsWindow>(60)

  const [state, setState] =
    useState<MetricsState | null>(null)

  /** Only drives the spinner; a background poll never sets it. */
  const [refreshing, setRefreshing] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)

  /**
   * Set when the route answers 404. The Dashboard gates this panel on the
   * `/api/meta` capability, but that gate fails open when the handshake
   * itself failed — in which case the capability is unknown, and a backend
   * without `/api/v1/metrics` would otherwise be polled once a minute
   * forever. A 404 is proof the route is missing, so stop the poll and let
   * the user retry by hand.
   */
  const [unsupported, setUnsupported] = useState(false)

  const unsupportedRef = useRef(false)

  const retry = useCallback(() => {
    // Clear a previous "this route does not exist" verdict so the poll can
    // resume if the backend has since been upgraded.
    unsupportedRef.current = false
    setUnsupported(false)
    setRefreshing(true)
    setReloadKey((key) => key + 1)
  }, [])

  const { status } = useServerStatus()

  useEffect(() => {
    const controller = new AbortController()

    /**
     * `manual` marks the fetch that a Refresh click (or a window change)
     * triggered. Only that one may clear the spinner: a background poll
     * finishing first must not make the button look idle while the user's
     * own request is still in flight.
     */
    async function fetchOnce(manual: boolean) {
      try {
        const next = await getMetrics(
          windowMinutes,
          controller.signal,
        )

        if (controller.signal.aborted) {
          return
        }

        // A later success (backend upgraded, or a manual retry) clears a
        // previous 404 verdict so the poll resumes.
        if (unsupportedRef.current) {
          unsupportedRef.current = false
          setUnsupported(false)
        }

        setState({
          window: windowMinutes,
          data: next,
          error: null,
        })
      } catch (caught) {
        if (controller.signal.aborted) {
          return
        }

        // A missing route is not a transient failure: remember it so the
        // poll stops instead of hammering a backend that has no metrics.
        if (caught instanceof ApiError && caught.status === 404) {
          unsupportedRef.current = true
          setUnsupported(true)
        }

        setState((previous) => ({
          window: windowMinutes,
          // Keep the last good series so one failed refresh does not
          // blank the charts, but never mix windows.
          data:
            previous !== null &&
            previous.window === windowMinutes
              ? previous.data
              : null,
          error:
            caught instanceof Error
              ? caught.message
              : 'Failed to load metrics',
        }))
      } finally {
        if (manual && !controller.signal.aborted) {
          setRefreshing(false)
        }
      }
    }

    void fetchOnce(reloadKey > 0)

    const timer = window.setInterval(() => {
      // Same rule as the status poller: no background traffic while the
      // tab is hidden, and an immediate refresh when it comes back.
      if (
        !unsupportedRef.current &&
        document.visibilityState === 'visible'
      ) {
        void fetchOnce(false)
      }
    }, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (
        !unsupportedRef.current &&
        document.visibilityState === 'visible'
      ) {
        void fetchOnce(false)
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [windowMinutes, reloadKey])

  // Data from another window must never be drawn under this window's
  // label, so it is only used once its `window` matches. That also makes
  // `loading` derivable instead of a second piece of state.
  const forWindow =
    state !== null && state.window === windowMinutes
      ? state
      : null

  const current = forWindow?.data ?? null
  const error = forWindow?.error ?? null
  const loading = forWindow === null

  const latest: MetricsSample | null =
    current?.latest ??
    current?.points[current.points.length - 1] ??
    null

  const series = useMemo(() => {
    const points = current?.points ?? []

    return {
      cpu: points.map((point) => ({
        ts: point.ts,
        value: point.cpu_percent,
      })),
      memory: points.map((point) => ({
        ts: point.ts,
        value: point.memory_bytes,
      })),
      players: points.map((point) => ({
        ts: point.ts,
        value: point.players_online,
      })),
    }
  }, [current])

  const logStalled = status?.log_stalled === true
  const logAge =
    typeof status?.log_age === 'number'
      ? status.log_age
      : null

  return (
    <section
      className={[
        'rounded-xl',
        'border border-white/[0.07]',
        'bg-[#17191c]',
        'p-5',
      ].join(' ')}
    >

      {/* Header */}
      <div
        className={[
          'mb-5 flex flex-col gap-3',
          'sm:flex-row sm:items-center',
          'sm:justify-between',
        ].join(' ')}
      >

        <div className="flex items-center gap-2.5">

          <div className="text-gray-500">
            <LineChart size={17} />
          </div>

          <div>

            <h3 className="text-sm font-medium text-gray-200">
              Resource Trends
            </h3>

            <p className="mt-0.5 text-[11px] text-gray-600">
              {current
                ? describeSampling(current)
                : 'Container CPU, memory, disk and player count'}
            </p>

          </div>

        </div>


        <div className="flex items-center gap-2">

          {/* Window switcher */}
          <div
            className={[
              'flex items-center gap-0.5',
              'rounded-lg',
              'border border-white/[0.07]',
              'bg-white/[0.02]',
              'p-0.5',
            ].join(' ')}
          >
            {METRICS_WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setWindowMinutes(window)}
                aria-pressed={window === windowMinutes}
                className={[
                  'rounded-md px-2.5 py-1',
                  'text-xs transition',
                  window === windowMinutes
                    ? [
                        'bg-white/[0.07]',
                        'text-gray-200',
                      ].join(' ')
                    : [
                        'text-gray-600',
                        'hover:text-gray-300',
                      ].join(' '),
                ].join(' ')}
              >
                {METRICS_WINDOW_LABELS[window]}
              </button>
            ))}
          </div>


          <button
            type="button"
            onClick={retry}
            disabled={loading || refreshing}
            className="ui-icon-button"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              className={
                loading || refreshing
                  ? 'motion-safe:animate-spin'
                  : ''
              }
            />
          </button>

        </div>

      </div>


      {/* Body */}
      {/* A failed refresh keeps the previous series on screen; the banner
          says the numbers are stale instead of hiding them. */}
      {/* A missing route is not a fault to alarm about: the Dashboard's
          capability gate fails open when the /api/meta handshake itself
          failed, so this is what an API 1.x backend looks like. */}
      {unsupported && (
        <div
          className={[
            'rounded-lg border border-dashed',
            'border-white/[0.07] bg-white/[0.012]',
            'px-4 py-8 text-center',
          ].join(' ')}
        >
          <div className="text-sm text-gray-400">
            This API has no metrics endpoint
          </div>

          <div className="mx-auto mt-1.5 max-w-lg text-[11px] leading-5 text-gray-500">
            <span className="font-mono">GET /api/v1/metrics</span>{' '}
            answered 404, so the panel stopped polling it. The backend
            needs the{' '}
            <span className="font-mono">server.metrics</span>{' '}
            capability (API 2.0.0+).
          </div>

          <button
            type="button"
            onClick={retry}
            disabled={refreshing}
            className={[
              'ui-button',
              'ui-button-secondary',
              'mt-4',
            ].join(' ')}
          >
            Check again
          </button>
        </div>
      )}

      {error !== null && !unsupported && (
        <div
          role="alert"
          className={[
            'mb-4 flex items-start',
            'justify-between gap-3',
            'rounded-lg',
            'border border-red-500/20',
            'bg-red-500/[0.07]',
            'px-4 py-3',
          ].join(' ')}
        >

          <div>

            <div className="text-sm font-medium text-red-300">
              Could not load metrics
            </div>

            <div className="mt-1 text-xs text-red-300/80">
              {error}
            </div>

          </div>


          <button
            type="button"
            onClick={retry}
            disabled={refreshing}
            className={[
              'ui-button',
              'ui-button-secondary',
              'shrink-0',
            ].join(' ')}
          >
            Retry
          </button>

        </div>
      )}

      {current === null ? (

        loading ? (
          <div
            className={[
              'rounded-lg',
              'border border-white/[0.07]',
              'bg-white/[0.015]',
              'px-4 py-8',
              'text-center text-sm text-gray-600',
            ].join(' ')}
          >
            Loading metrics...
          </div>
        ) : null

      ) : current.points.length === 0 ? (

        <div
          className={[
            'rounded-lg',
            'border border-dashed border-white/[0.07]',
            'bg-white/[0.012]',
            'px-4 py-8',
            'text-center',
          ].join(' ')}
        >
          {/* "Sampling is switched off" is permanent and a different
              problem from "the buffer is empty right now", so they must
              not share one headline. */}
          <div className="text-sm text-gray-400">
            {current.interval_seconds <= 0
              ? describeSampling(current)
              : 'No samples in this window yet'}
          </div>

          <div className="mx-auto mt-1.5 max-w-lg text-[11px] text-gray-500">
            {current.interval_seconds <= 0
              ? 'Nothing will appear here until the backend sets a non-zero METRICS_INTERVAL_SECONDS and restarts.'
              : 'The API keeps samples in memory only, so this is also what a recent API restart looks like.'}
          </div>
        </div>

      ) : (

        <>

          <div className="grid gap-4 lg:grid-cols-3">

            <ChartCard
              icon={<Cpu size={15} />}
              title="CPU"
              value={
                latest?.cpu_percent !== null &&
                latest?.cpu_percent !== undefined
                  ? `${latest.cpu_percent.toFixed(1)}%`
                  : '—'
              }
              detail={
                typeof latest?.cpu_cores === 'number'
                  ? `${latest.cpu_cores} core${latest.cpu_cores === 1 ? '' : 's'} · 100% = all assigned cores`
                  : 'CPU reporting unavailable'
              }
            >
              <TrendChart
                points={series.cpu}
                color="#34d399"
                formatValue={(value) =>
                  `${value.toFixed(1)}%`
                }
                ariaLabel="CPU usage over time"
                emptyLabel="No CPU samples in this window."
              />
            </ChartCard>


            <ChartCard
              icon={<MemoryStick size={15} />}
              title="Memory"
              value={
                typeof latest?.memory_bytes === 'number'
                  ? formatBytes(latest.memory_bytes)
                  : '—'
              }
              detail={
                typeof latest?.memory_limit_bytes === 'number'
                  ? `of ${formatBytes(latest.memory_limit_bytes)} container limit`
                  : 'No container memory limit'
              }
            >
              <TrendChart
                points={series.memory}
                color="#60a5fa"
                formatValue={formatBytesShort}
                ariaLabel="Memory usage over time"
                emptyLabel="No memory samples in this window."
              />
            </ChartCard>


            <ChartCard
              icon={<Users size={15} />}
              title="Players Online"
              value={
                typeof latest?.players_online === 'number'
                  ? String(latest.players_online)
                  : '—'
              }
              detail="Reuses the console state cache"
            >
              <TrendChart
                points={series.players}
                color="#fbbf24"
                formatValue={(value) =>
                  value.toFixed(0)
                }
                ariaLabel="Players online over time"
                emptyLabel="No player-count samples in this window."
              />
            </ChartCard>

          </div>


          <DiskBar latest={latest} />


          {/* Log health, so "is the panel blind?" sits next to the load
              trend the operator is already looking at. */}
          <div
            className={[
              'mt-4 flex flex-wrap items-center gap-2',
              'rounded-lg',
              'border border-white/[0.05]',
              'bg-white/[0.015]',
              'px-3.5 py-2.5',
              'text-[11px]',
            ].join(' ')}
          >
            <span
              className={[
                'h-1.5 w-1.5 rounded-full',
                status === null
                  ? 'bg-gray-500'
                  : logStalled
                    ? 'bg-red-400'
                    : 'bg-emerald-400',
              ].join(' ')}
            />

            <span className="text-gray-500">
              {status === null
                ? 'Log pipeline status unknown'
                : logStalled
                  ? 'Log pipeline stalled'
                  : 'Log pipeline healthy'}
            </span>

            {logStalled && logAge !== null && (
              <span className="text-red-300/80">
                · last advanced {Math.round(logAge)}s ago
              </span>
            )}

            <span className="ml-auto text-gray-700">
              {current.points.length} of{' '}
              {current.retention_points} samples buffered
            </span>
          </div>

        </>
      )}

    </section>
  )
}


function describeSampling(
  metrics: MetricsResponse,
) {
  if (metrics.interval_seconds <= 0) {
    return 'The API reports sampling is disabled (interval 0s)'
  }

  return `One sample every ${Math.round(metrics.interval_seconds)}s · samples live in API memory only`
}


function ChartCard({
  icon,
  title,
  value,
  detail,
  children,
}: {
  icon: React.ReactNode
  title: string
  value: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <div
      className={[
        'rounded-lg',
        'border border-white/[0.05]',
        'bg-white/[0.012]',
        'p-4',
      ].join(' ')}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="flex items-center gap-2 text-gray-500">

          {icon}

          <span
            className={[
              'text-[11px] font-medium',
              'uppercase tracking-wide',
            ].join(' ')}
          >
            {title}
          </span>

        </div>


        <span className="font-mono text-sm text-gray-200">
          {value}
        </span>

      </div>


      <div className="mt-1 text-[10px] text-gray-700">
        {detail}
      </div>


      <div className="mt-3">
        {children}
      </div>

    </div>
  )
}


function DiskBar({
  latest,
}: {
  latest: MetricsSample | null
}) {
  const free = latest?.disk_free_bytes ?? null
  const total = latest?.disk_total_bytes ?? null

  if (free === null || total === null || total <= 0) {
    return null
  }

  const used = Math.max(0, total - free)
  const usedPercent = Math.min(
    100,
    Math.max(0, (used / total) * 100),
  )

  const tone =
    usedPercent >= 90
      ? 'bg-red-400'
      : usedPercent >= 75
        ? 'bg-amber-400'
        : 'bg-emerald-400'

  return (
    <div
      className={[
        'mt-4 flex flex-col gap-3',
        'rounded-lg',
        'border border-white/[0.05]',
        'bg-white/[0.012]',
        'px-3.5 py-3',
        'sm:flex-row sm:items-center',
      ].join(' ')}
    >

      <div className="flex items-center gap-2 text-gray-500 sm:w-40">

        <HardDrive size={15} />

        <span
          className={[
            'text-[11px] font-medium',
            'uppercase tracking-wide',
          ].join(' ')}
        >
          Disk
        </span>

      </div>


      <div className="min-w-0 flex-1">

        <div
          className={[
            'h-2 overflow-hidden',
            'rounded-full',
            'bg-white/[0.06]',
          ].join(' ')}
        >
          <div
            className={[
              'h-full rounded-full',
              'motion-safe:transition-all motion-safe:duration-300',
              tone,
            ].join(' ')}
            style={{ width: `${usedPercent}%` }}
          />
        </div>

      </div>


      <div className="shrink-0 text-[11px] text-gray-500">
        {formatBytes(free)} free of {formatBytes(total)}
        {' · '}
        {usedPercent.toFixed(1)}% used
      </div>

    </div>
  )
}


/* ------------------------------ */
/* Formatting                      */
/* ------------------------------ */

function formatBytes(bytes: number) {
  const absolute = Math.abs(bytes)

  if (absolute < 1024) {
    return `${bytes.toFixed(0)} B`
  }

  if (absolute < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (absolute < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Axis and tooltip variant: no space between value and unit. */
function formatBytesShort(bytes: number) {
  return formatBytes(bytes).replace(' ', '')
}
