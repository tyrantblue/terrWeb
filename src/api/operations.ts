import { apiFetch } from './client'
import type { OperationStart } from './world'

/**
 * `BackupEntry` only requires name/created_at/files/size. `kind`,
 * `restorable` and `path` carry server-side defaults (`restorable` is
 * true), so a conforming response may omit them — treating a missing
 * `restorable` as falsy would wrongly disable every restore button.
 */
export interface Backup {
  name: string
  created_at: number
  files: number
  size: number
  kind?: 'manual' | 'auto' | 'legacy'
  restorable?: boolean
  path?: string
}

export interface BackupsResponse {
  backups: Backup[]
}

export interface ScheduleHistory {
  at: number
  status: 'succeeded' | 'skipped' | 'failed'
  /** Optional in the contract (`JobRun`), and nullable when present. */
  detail?: string | null
  duration: number
  manual: boolean
}

export interface ScheduleJob {
  name: string
  kind: string
  description: string
  enabled: boolean
  interval_seconds: number | null
  at: string | null
  next_run: number | null
  last_run: number | null
  last_status: 'succeeded' | 'skipped' | 'failed' | null
  last_detail: string | null
  run_count: number
  skipped_count: number
  failed_count: number
  history: ScheduleHistory[]
}

export interface SchedulerResponse {
  enabled: boolean
  timezone: string
  jobs: ScheduleJob[]
}

export interface NotificationDelivery {
  ts: number
  event: string
  title: string
  ok: boolean
  status: number | null
  error: string | null
}

export interface NotificationsResponse {
  enabled: boolean
  /** Masked webhook URL; the API never echoes the full secret. */
  url: string
  format: string
  events: string | string[]
  deliveries: NotificationDelivery[]
}

export interface GuardAllowEntry {
  ip: string
  source: 'static' | 'learned'
  expires_at: number | null
}

export interface GuardBanEntry {
  ip: string
  expires_at: number | null
}

export interface GuardCounters {
  bans_total: number
  commands_total: number
  learned_total: number
  degraded_console: number
}

/**
 * The contract only requires `available`; every other field may be
 * absent when the guard container is not publishing state. The panel
 * normalizes to this fully-populated shape so views never have to
 * defend against missing arrays.
 */
export interface GuardResponse {
  available: boolean
  stale: boolean
  age: number
  updated_at: number | null
  port: number | null
  allowlist_only: boolean
  allow: GuardAllowEntry[]
  banned: GuardBanEntry[]
  counters: GuardCounters
}

type GuardStateWire = Partial<
  Omit<GuardResponse, 'available'>
> & { available: boolean }

export function getBackups() {
  return apiFetch<BackupsResponse>(
    '/api/v1/backups',
  )
}

export function restoreBackup(
  name: string,
  file?: string,
) {
  return apiFetch<OperationStart>(
    `/api/v1/backups/${encodeURIComponent(name)}/restore`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        file ? { file } : {},
      ),
    },
  )
}

export function getScheduler() {
  return apiFetch<SchedulerResponse>(
    '/api/v1/scheduler',
  )
}

/** Name of the backend's log-pipeline heartbeat job (API 1.4.2+). */
export const CONSOLE_HEARTBEAT_JOB = 'console'

export type HeartbeatState =
  | 'ok'
  | 'stalled'
  | 'unavailable'
  | 'error'
  | 'unknown'

/**
 * The heartbeat job's `last_status` is always `succeeded` — the backend
 * reports a stall only in `last_detail`. Reading the status field alone
 * therefore paints a stalled log pipeline green, hiding the one failure
 * the panel most needs to surface.
 */
export function classifyHeartbeatDetail(
  detail: string | null | undefined,
): HeartbeatState {
  if (typeof detail !== 'string') {
    return 'unknown'
  }

  const value = detail.trim().toLowerCase()

  // Matches both "stalled: ..." and "stalled (已告警过，冷却中)".
  if (value.startsWith('stalled')) {
    return 'stalled'
  }

  // A restart window or a mutually-exclusive operation: expected, so it
  // is not a fault.
  if (value.startsWith('unavailable')) {
    return 'unavailable'
  }

  // The probe itself raised something unexpected. This is NOT the same as
  // "no heartbeat job", which is deliberately quiet — reporting it as
  // unknown would render a real probe failure as a healthy heartbeat.
  if (value.startsWith('error')) {
    return 'error'
  }

  if (value.startsWith('ok')) {
    return 'ok'
  }

  return 'unknown'
}

export function findHeartbeatJob(
  scheduler: SchedulerResponse | null,
) {
  return (
    scheduler?.jobs.find(
      (job) => job.name === CONSOLE_HEARTBEAT_JOB,
    ) ?? null
  )
}

export function runSchedule(name: string) {
  return apiFetch<Record<string, unknown>>(
    `/api/v1/scheduler/${encodeURIComponent(name)}/run`,
    { method: 'POST' },
  )
}

export function getNotifications() {
  return apiFetch<NotificationsResponse>(
    '/api/v1/notifications',
  )
}

export function testNotifications() {
  return apiFetch<NotificationDelivery>(
    '/api/v1/notifications/test',
    { method: 'POST' },
  )
}

export async function getGuard(): Promise<GuardResponse> {
  const state = await apiFetch<GuardStateWire>(
    '/api/v1/guard',
  )

  return {
    available: state.available,
    stale: state.stale ?? false,
    age: state.age ?? 0,
    updated_at: state.updated_at ?? null,
    port: state.port ?? null,
    allowlist_only: state.allowlist_only ?? false,
    allow: state.allow ?? [],
    banned: state.banned ?? [],
    counters: {
      bans_total: state.counters?.bans_total ?? 0,
      commands_total:
        state.counters?.commands_total ?? 0,
      learned_total: state.counters?.learned_total ?? 0,
      degraded_console:
        state.counters?.degraded_console ?? 0,
    },
  }
}

export function banIp(ip: string, seconds?: number) {
  return apiFetch('/api/v1/guard/bans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, seconds }),
  })
}

export function unbanIp(ip: string) {
  return apiFetch(
    `/api/v1/guard/bans/${encodeURIComponent(ip)}`,
    { method: 'DELETE' },
  )
}

export function allowIp(ip: string) {
  return apiFetch('/api/v1/guard/allow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip }),
  })
}

export function removeAllowedIp(ip: string) {
  return apiFetch(
    `/api/v1/guard/allow/${encodeURIComponent(ip)}`,
    { method: 'DELETE' },
  )
}

export function reloadGuard() {
  return apiFetch('/api/v1/guard/reload', {
    method: 'POST',
  })
}
