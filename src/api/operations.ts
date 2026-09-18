import { apiFetch } from './client'
import type { OperationStart } from './world'

export interface Backup {
  name: string
  created_at: number
  files: number
  size: number
  kind: 'manual' | 'auto' | 'legacy'
  restorable: boolean
  path: string
}

export interface BackupsResponse {
  backups: Backup[]
}

export interface ScheduleHistory {
  at: number
  status: 'succeeded' | 'skipped' | 'failed'
  detail: string
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
  url: string | null
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

export interface GuardResponse {
  available: boolean
  stale: boolean
  age: number | null
  updated_at: number | null
  port: number | null
  allowlist_only: boolean
  allow: GuardAllowEntry[]
  banned: GuardBanEntry[]
  counters: {
    bans_total: number
    commands_total: number
    learned_total: number
    degraded_console: number
  }
}

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

export function getGuard() {
  return apiFetch<GuardResponse>('/api/v1/guard')
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
