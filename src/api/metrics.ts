import { apiFetch } from './client'

/**
 * One sampling point of `GET /api/v1/metrics` (API 2.0.0+, capability
 * `server.metrics`). Every field besides `ts` is nullable: the backend
 * runs on non-Linux hosts without cgroup and reports `null` instead of a
 * fabricated zero, and `memory_limit_bytes: null` means the container has
 * no memory limit rather than 0 bytes.
 */
export interface MetricsSample {
  /** Epoch seconds. */
  ts: number
  cpu_percent: number | null
  cpu_cores: number | null
  memory_bytes: number | null
  memory_limit_bytes: number | null
  disk_free_bytes: number | null
  disk_total_bytes: number | null
  players_online: number | null
}

export interface MetricsResponse {
  interval_seconds: number
  retention_points: number
  window_minutes: number
  latest: MetricsSample | null
  /** Oldest first. Sampling happens in API-process memory, so this can be
   * empty right after an API restart, or permanently when the backend is
   * configured with `METRICS_INTERVAL_SECONDS=0`. */
  points: MetricsSample[]
}

/** The windows the backend accepts; `minutes` is capped at 1440. */
export const METRICS_WINDOWS = [60, 360, 1440] as const

export type MetricsWindow =
  (typeof METRICS_WINDOWS)[number]

export const METRICS_WINDOW_LABELS: Record<
  MetricsWindow,
  string
> = {
  60: '1h',
  360: '6h',
  1440: '24h',
}

function toNumberOrNull(
  value: unknown,
): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value)
    ? value
    : null
}

function normalizeSample(
  value: unknown,
): MetricsSample | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const raw = value as Record<string, unknown>
  const ts = toNumberOrNull(raw.ts)

  // A point without a timestamp cannot be placed on the time axis at all.
  if (ts === null) {
    return null
  }

  return {
    ts,
    cpu_percent: toNumberOrNull(raw.cpu_percent),
    cpu_cores: toNumberOrNull(raw.cpu_cores),
    memory_bytes: toNumberOrNull(raw.memory_bytes),
    memory_limit_bytes: toNumberOrNull(
      raw.memory_limit_bytes,
    ),
    disk_free_bytes: toNumberOrNull(
      raw.disk_free_bytes,
    ),
    disk_total_bytes: toNumberOrNull(
      raw.disk_total_bytes,
    ),
    players_online: toNumberOrNull(
      raw.players_online,
    ),
  }
}

/**
 * `/api/v1/metrics` is not runtime-validated here, and the values are fed
 * straight into chart arithmetic, so a stray string would turn every
 * coordinate into `NaN`. Normalize once at the boundary.
 */
function normalizeMetrics(
  value: unknown,
): MetricsResponse {
  const raw =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {}

  const points = Array.isArray(raw.points)
    ? raw.points
        .map(normalizeSample)
        .filter(
          (point): point is MetricsSample =>
            point !== null,
        )
        // The contract promises ascending order; sorting a copy keeps the
        // x axis monotonic even if a deployment breaks that promise.
        .sort((left, right) => left.ts - right.ts)
    : []

  return {
    interval_seconds:
      toNumberOrNull(raw.interval_seconds) ?? 0,
    retention_points:
      toNumberOrNull(raw.retention_points) ?? 0,
    window_minutes:
      toNumberOrNull(raw.window_minutes) ?? 0,
    latest: normalizeSample(raw.latest),
    points,
  }
}

/**
 * Resource and player-count time series. `minutes` defaults to 60 on the
 * backend and is capped at 1440 (24h).
 */
export function getMetrics(
  minutes: number = 60,
  signal?: AbortSignal,
) {
  return apiFetch<unknown>(
    `/api/v1/metrics?minutes=${encodeURIComponent(String(minutes))}`,
    { signal },
  ).then(normalizeMetrics)
}
