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
  /** qqPush job id, for looking the delivery up yourself. */
  job_id?: string | null
  /** Free-form qualifier, e.g. accepted-but-unconfirmed. */
  note?: string | null
}

/** QQ 频道机器人 credentials; the secret is only ever echoed as a mask. */
export interface NotificationQQStatus {
  app_id: string
  /** Masked (`••••••`) once set — never send this back. */
  client_secret: string
  client_secret_set: boolean
  channel_id: string
  sandbox: boolean
  api_base: string
  token_url: string
}

/** qqPush forwarding service; `token` only ever comes back masked. */
export interface NotificationQQPushStatus {
  base_url: string
  base_url_set: boolean
  /** Masked once set — never send this back. */
  token: string
  token_set: boolean
  /** Group name or openid; empty uses the service's default targets. */
  target: string
  /** How long to poll `/status/<job_id>`; the backend clamps it to 0..30. */
  verify_seconds: number
}

/**
 * One entry of the channel catalogue. The backend states which fields each
 * channel needs, so the form is built from this rather than hardcoding a
 * field list per channel — a new channel needs no frontend release.
 * Field names are dot-paths, e.g. `url` or `qqpush.base_url`.
 */
export interface NotificationProviderInfo {
  name: string
  required: string[]
  optional: string[]
}

/** A deliverable target of the active channel (qqPush group names/openids). */
export interface NotificationTargetEntry {
  name?: string
  openid?: string
  [key: string]: unknown
}

export interface NotificationTargetsResponse {
  provider: string
  channel: string
  target_hint: string
  targets: string[]
  openids: NotificationTargetEntry[]
  default_targets: string[]
}

/** Where the active notification config came from. */
export type NotificationSource = 'env' | 'file'

export interface NotificationsResponse {
  enabled: boolean
  /** The configured channel, e.g. `qq`, `feishu`, `none`. */
  provider: string
  /** The channel actually used — `auto` resolves to a concrete one here. */
  format: string
  /** Host-only echo of the webhook URL; the full URL is a credential. */
  url: string
  url_set: boolean
  events: string | string[]
  /** Fields still needed before delivery can work, e.g. `["qq.client_secret"]`. */
  missing: string[]
  source: NotificationSource
  /** Channel catalogue straight from the backend. */
  providers: NotificationProviderInfo[]
  qq: NotificationQQStatus
  qqpush: NotificationQQPushStatus
  deliveries: NotificationDelivery[]
}

/** Channels accepted by `provider`. */
/**
 * Display names for channels. The backend's catalogue decides which are
 * offered; this only supplies a prettier label, falling back to the raw name.
 */
export const NOTIFICATION_PROVIDER_LABELS: Record<string, string> = {
  auto: 'Auto (detect from URL)',
  feishu: 'Feishu / Lark',
  discord: 'Discord',
  slack: 'Slack',
  json: 'Generic JSON',
  qq: 'QQ channel bot',
  qqpush: 'qqPush (QQ group forwarding)',
  none: 'Off (keep credentials)',
}

export function notificationProviderLabel(name: string) {
  return NOTIFICATION_PROVIDER_LABELS[name] ?? name
}

/** Event vocabulary; `test` is reserved for the test endpoint. */
export const NOTIFICATION_EVENTS = [
  'player_join',
  'player_leave',
  'player_booted',
  'server_up',
  'server_error',
  'backup_done',
  'schedule_failed',
  'restart_skipped',
  'log_stalled',
] as const

export interface NotificationQQUpdate {
  app_id?: string | null
  client_secret?: string | null
  channel_id?: string | null
  sandbox?: boolean | null
  api_base?: string | null
  token_url?: string | null
}

export interface NotificationQQPushUpdate {
  base_url?: string | null
  token?: string | null
  target?: string | null
  verify_seconds?: number | null
}

/**
 * Merge semantics, so a read-modify-write from the panel is safe:
 * an omitted or `null` field keeps its current value, `""` clears it, and a
 * mask is treated as "keep" (a mask can never be a real credential).
 */
export interface NotificationSettingsUpdate {
  provider?: string | null
  url?: string | null
  events?: string | null
  qq?: NotificationQQUpdate | null
  qqpush?: NotificationQQPushUpdate | null
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

/** Writes the runtime config (control/notify.json); takes effect at once. */
export function updateNotificationSettings(
  patch: NotificationSettingsUpdate,
) {
  return apiFetch<NotificationsResponse>(
    '/api/v1/notifications/settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  )
}

/**
 * Delivery targets the active channel can reach. Only `qqpush` supports it:
 * every other channel answers 400 with `error.details.supported`.
 */
export function getNotificationTargets() {
  return apiFetch<NotificationTargetsResponse>(
    '/api/v1/notifications/targets',
  )
}


/** Drops the runtime config and falls back to the NOTIFY_* env defaults. */
export function resetNotificationSettings() {
  return apiFetch<NotificationsResponse>(
    '/api/v1/notifications/settings',
    { method: 'DELETE' },
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
