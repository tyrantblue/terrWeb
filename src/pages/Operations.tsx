import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import {
  Activity,
  ArchiveRestore,
  Bell,
  CalendarClock,
  Check,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
} from 'lucide-react'

import {
  CONSOLE_HEARTBEAT_JOB,
  allowIp,
  banIp,
  classifyHeartbeatDetail,
  NOTIFICATION_EVENTS,
  NOTIFICATION_PROVIDERS,
  getBackups,
  getGuard,
  getNotifications,
  getScheduler,
  reloadGuard,
  removeAllowedIp,
  restoreBackup,
  runSchedule,
  resetNotificationSettings,
  testNotifications,
  unbanIp,
  updateNotificationSettings,
  type Backup,
  type BackupsResponse,
  type GuardResponse,
  type NotificationDelivery,
  type NotificationQQUpdate,
  type NotificationSettingsUpdate,
  type NotificationsResponse,
  type SchedulerResponse,
} from '../api/operations'
import { ApiError } from '../api/client'
import { formatErrorReport } from '../api/errors'
import { CAPABILITIES, useApiMeta } from '../context/apiMeta'
import {
  runOperation,
  waitForOperation,
  type Operation,
} from '../api/world'
import ConfirmDialog from '../components/ConfirmDialog'
import { useConsoleHeartbeat } from '../context/consoleHeartbeat'
import { useOperations } from '../context/operations'
import { useAbortOnUnmount } from '../hooks/useAbortOnUnmount'

type OperationsTab =
  | 'backups'
  | 'scheduler'
  | 'operations'
  | 'guard'
  | 'notifications'

const tabs: Array<{
  id: OperationsTab
  label: string
  icon: typeof ArchiveRestore
}> = [
  { id: 'backups', label: 'Backups', icon: ArchiveRestore },
  { id: 'scheduler', label: 'Scheduler', icon: CalendarClock },
  { id: 'operations', label: 'Operations', icon: Activity },
  { id: 'guard', label: 'Guard', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function Operations() {
  const [activeTab, setActiveTab] = useState<OperationsTab>('backups')
  const heartbeat = useConsoleHeartbeat()

  const { hasCapability } = useApiMeta()

  // 2.2.0 added the write endpoints; older backends keep the tab read-only.
  const canEditNotifications = hasCapability(
    CAPABILITIES.notificationsSettings,
  )

  // Aborts any in-flight operation wait when this page unmounts.
  const operationsAbort = useAbortOnUnmount()

  // Lives in a provider that polls every few seconds, so an operation
  // started before a page reload is still visible with live progress.
  const {
    operations,
    loading: operationsLoading,
    error: operationsError,
    refresh: refreshOperations,
  } = useOperations()

  const [backups, setBackups] = useState<BackupsResponse | null>(null)
  const [scheduler, setScheduler] = useState<SchedulerResponse | null>(null)
  const [guard, setGuard] = useState<GuardResponse | null>(null)
  const [notifications, setNotifications] = useState<NotificationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [message, setMessage] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)
  const [restoreCandidates, setRestoreCandidates] = useState<string[]>([])
  const [restoreFile, setRestoreFile] = useState('')
  const [scheduleTarget, setScheduleTarget] = useState('')
  const [guardTarget, setGuardTarget] = useState<{
    kind: 'allow' | 'ban'
    ip: string
  } | null>(null)

  async function loadAll() {
    try {
      setLoading(true)
      const results = await Promise.allSettled([
        getBackups(),
        getScheduler(),
        getGuard(),
        getNotifications(),
      ])

      if (results[0].status === 'fulfilled') setBackups(results[0].value)
      if (results[1].status === 'fulfilled') setScheduler(results[1].value)
      if (results[2].status === 'fulfilled') setGuard(results[2].value)
      if (results[3].status === 'fulfilled') setNotifications(results[3].value)


      const failures = results.filter((result) => result.status === 'rejected')
      setMessage(failures.length ? `${failures.length} operations section(s) could not be loaded.` : '')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleRestore() {
    if (!restoreTarget) return
    try {
      setAction(`restore:${restoreTarget.name}`)
      setMessage(`Restoring ${restoreTarget.name}...`)
      await runOperation(
        () => restoreBackup(restoreTarget.name, restoreFile || undefined),
        {
          onProgress: (current) => {
            setMessage(current.message ?? `Restoring ${restoreTarget.name}... ${current.progress}%`)
          },
        },
      )
      setRestoreTarget(null)
      setRestoreCandidates([])
      setRestoreFile('')
      setMessage(`Restored ${restoreTarget.name}.`)
      setBackups(await getBackups())
    } catch (error) {
      if (error instanceof ApiError) {
        const candidates = error.details?.candidates

        if (
          Array.isArray(candidates) &&
          candidates.every(
            (candidate) => typeof candidate === 'string',
          )
        ) {
          setRestoreCandidates(candidates)
          setRestoreFile(candidates[0] ?? '')
          setMessage('Choose the world file to restore from this backup.')
          return
        }
      }

      setMessage(formatErrorReport(error))
    } finally {
      setAction('')
    }
  }

  async function handleSchedule(name: string) {
    try {
      setAction(`schedule:${name}`)
      setMessage(`Running ${name}...`)
      const result = await runSchedule(name)
      const submitted = getSubmittedOperationId(result)

      if (submitted !== null) {
        // The job already returned its operation id, so there is no start
        // request left to conflict with.
        await waitForOperation(submitted, {
          onProgress: (current) => {
            setMessage(
              current.message ??
                `Running ${name}... ${current.progress}%`,
            )
          },
          signal: operationsAbort.current?.signal,
        })
      }

      // Report the job's actual outcome. Jobs like `save` skip
      // themselves when nobody is online, and claiming "finished" for a
      // no-op is misleading.
      const refreshed = await getScheduler()
      setScheduler(refreshed)

      if (name === CONSOLE_HEARTBEAT_JOB) {
        void heartbeat.refresh()
      }

      const job = refreshed.jobs.find(
        (candidate) => candidate.name === name,
      )
      const detail = job?.last_detail

      if (submitted !== null) {
        // The restart-class job was handed off to the operation framework
        // and we waited for it above, so this is a real completion.
        setMessage(`${name} finished.`)
      } else if (job?.last_status === 'skipped') {
        setMessage(`${name} was skipped${detail ? `: ${detail}` : '.'}`)
      } else if (job?.last_status === 'failed') {
        setMessage(`${name} failed${detail ? `: ${detail}` : '.'}`)
      } else {
        setMessage(`${name} finished.`)
      }

      return true
    } catch (error) {
      setMessage(formatErrorReport(error))
      return false
    } finally {
      setAction('')
    }
  }

  function openRestore(backup: Backup) {
    // Reset the dialog's status area so it only reflects this attempt.
    setMessage('')
    setRestoreTarget(backup)
  }

  function requestSchedule(name: string) {
    if (name === 'restart') {
      setMessage('')
      setScheduleTarget(name)
      return
    }

    void handleSchedule(name)
  }

  async function handleGuardAction(
    key: string,
    operation: () => Promise<unknown>,
  ) {
    try {
      setAction(key)
      await operation()
      setGuard(await getGuard())
      setMessage('Guard updated.')
      return true
    } catch (error) {
      setMessage(formatErrorReport(error))
      return false
    } finally {
      setAction('')
    }
  }

  function requestGuardRemoval(
    kind: 'allow' | 'ban',
    ip: string,
  ) {
    setMessage('')
    setGuardTarget({ kind, ip })
  }

  async function handleGuardRemoval() {
    if (!guardTarget) return

    const { kind, ip } = guardTarget
    const succeeded = await handleGuardAction(
      kind === 'allow'
        ? `remove-allow:${ip}`
        : `unban:${ip}`,
      () => kind === 'allow'
        ? removeAllowedIp(ip)
        : unbanIp(ip),
    )

    if (succeeded) setGuardTarget(null)
  }

  async function handleNotificationSave(
    patch: NotificationSettingsUpdate,
  ) {
    try {
      setAction('notification-save')
      setNotifications(await updateNotificationSettings(patch))
      setMessage('Notification target saved.')
      return true
    } catch (error) {
      setMessage(formatErrorReport(error))
      return false
    } finally {
      setAction('')
    }
  }

  async function handleNotificationReset() {
    try {
      setAction('notification-reset')
      setNotifications(await resetNotificationSettings())
      setMessage('Reverted to the environment defaults.')
      return true
    } catch (error) {
      setMessage(formatErrorReport(error))
      return false
    } finally {
      setAction('')
    }
  }

  async function handleNotificationTest() {
    try {
      setAction('notification-test')
      const result = await testNotifications()
      setMessage(result.ok ? 'Test notification delivered.' : result.error ?? 'Test delivery failed.')
      setNotifications(await getNotifications())
    } catch (error) {
      setMessage(formatErrorReport(error))
    } finally {
      setAction('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="ui-icon-tile h-10 w-10"><ShieldCheck size={20} /></div>
          <div>
            <h2 className="ui-page-title">Operations</h2>
            <p className="ui-page-description">Backups, automation, access guard and notifications</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadAll()} disabled={loading || Boolean(action)} className="ui-button ui-button-secondary">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {message && <div role="status" aria-live="polite" className="ui-panel-subtle px-4 py-3 text-sm text-gray-400">{message}</div>}

      <div className="flex overflow-x-auto border-b border-white/[0.07]" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={[
            'flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-sm transition',
            activeTab === id ? 'border-emerald-400 text-gray-100' : 'border-transparent text-gray-600 hover:text-gray-300',
          ].join(' ')}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'backups' && (
        <BackupsView backups={backups?.backups ?? []} loading={loading} action={action} onRestore={openRestore} />
      )}
      {activeTab === 'scheduler' && (
        <SchedulerView scheduler={scheduler} loading={loading} action={action} onRun={requestSchedule} />
      )}
      {activeTab === 'operations' && (
        <OperationsHistoryView
          operations={operations}
          loading={operationsLoading}
          failed={operationsError !== null}
          onRefresh={refreshOperations}
        />
      )}
      {activeTab === 'guard' && (
        <GuardView guard={guard} loading={loading} action={action} onAction={handleGuardAction} onRemove={requestGuardRemoval} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsView
          notifications={notifications}
          loading={loading}
          testing={action === 'notification-test'}
          canEdit={canEditNotifications}
          saving={action === 'notification-save'}
          resetting={action === 'notification-reset'}
          busy={action !== ''}
          onTest={handleNotificationTest}
          onSave={handleNotificationSave}
          onReset={handleNotificationReset}
        />
      )}

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open && !action) {
            setRestoreTarget(null)
            setRestoreCandidates([])
            setRestoreFile('')
          }
        }}
        title="Restore backup"
        description={restoreTarget ? `Restore ${restoreTarget.name}? Active worlds may restart twice and a safety copy will be created first.` : ''}
        confirmText="Restore"
        onConfirm={handleRestore}
        loading={action.startsWith('restore:')}
        status={message || undefined}
      >
        {restoreCandidates.length > 0 && (
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-medium text-gray-500">World file</span>
            <select
              value={restoreFile}
              onChange={(event) => setRestoreFile(event.target.value)}
              className="ui-input w-full px-3 py-2.5 text-sm"
            >
              {restoreCandidates.map((candidate) => (
                <option key={candidate} value={candidate}>{candidate}</option>
              ))}
            </select>
          </label>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={scheduleTarget !== ''}
        onOpenChange={(open) => {
          if (!open && !action) setScheduleTarget('')
        }}
        title="Restart server"
        description="Run the restart job now? Connected players may be disconnected."
        confirmText="Restart"
        onConfirm={async () => {
          const succeeded = await handleSchedule(scheduleTarget)
          if (succeeded) setScheduleTarget('')
        }}
        loading={action === `schedule:${scheduleTarget}`}
        status={message || undefined}
      />

      <ConfirmDialog
        open={guardTarget !== null}
        onOpenChange={(open) => {
          if (!open && !action) setGuardTarget(null)
        }}
        title={guardTarget?.kind === 'allow'
          ? 'Remove allowed IP'
          : 'Unban IP'}
        description={guardTarget
          ? guardTarget.kind === 'allow'
            ? `Remove ${guardTarget.ip} from the allowlist? This may revoke server access immediately.`
            : `Remove the ban for ${guardTarget.ip}? This address will be able to connect again.`
          : ''}
        confirmText={guardTarget?.kind === 'allow'
          ? 'Remove'
          : 'Unban'}
        onConfirm={handleGuardRemoval}
        loading={
          action.startsWith('remove-allow:') ||
          action.startsWith('unban:')
        }
        status={message || undefined}
      />
    </div>
  )
}

function BackupsView({ backups, loading, action, onRestore }: { backups: Backup[]; loading: boolean; action: string; onRestore: (backup: Backup) => void }) {
  if (loading && !backups.length) return <EmptyState text="Loading backups..." />
  if (!backups.length) return <EmptyState text="No backups available." />

  return <div className="ui-scroll-region grid gap-3 pr-1 lg:grid-cols-2">
    {backups.map((backup) => (
      <div key={backup.name} className="ui-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-200">{backup.name}</div>
            <div className="mt-1 text-xs text-gray-600">{formatDate(backup.created_at)} · {formatSize(backup.size)} · {getBackupFileCount(backup.files)} file(s)</div>
          </div>
          <span className="ui-status ui-status-neutral uppercase">{backup.kind ?? 'manual'}</span>
        </div>
        <button type="button" onClick={() => onRestore(backup)} disabled={backup.restorable === false || Boolean(action)} className="ui-button ui-button-accent mt-4 w-full">
          <RotateCcw size={15} /> {backup.restorable === false ? 'Not restorable' : 'Restore backup'}
        </button>
      </div>
    ))}
  </div>
}

function SchedulerView({ scheduler, loading, action, onRun }: { scheduler: SchedulerResponse | null; loading: boolean; action: string; onRun: (name: string) => void }) {
  if (loading && !scheduler) return <EmptyState text="Loading scheduler..." />
  if (!scheduler) return <EmptyState text="Scheduler is unavailable." />

  return <div className="space-y-4">
    <div className="flex items-center justify-between text-sm text-gray-500"><span>Timezone: {scheduler.timezone}</span><StatusBadge ok={scheduler.enabled} on="Enabled" off="Disabled" /></div>
    <div className="ui-scroll-region grid gap-3 pr-1 lg:grid-cols-3">
      {scheduler.jobs.map((job) => {
        // The heartbeat job always reports `succeeded`; only
        // `last_detail` reveals a stalled log pipeline.
        const heartbeat = job.name === CONSOLE_HEARTBEAT_JOB
          ? classifyHeartbeatDetail(job.last_detail)
          : null

        const stalled =
          heartbeat === 'stalled' || heartbeat === 'error'

        return (
          <div
            key={job.name}
            className={[
              'ui-panel p-4',
              stalled ? 'border-red-500/30 bg-red-500/[0.04]' : '',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium capitalize text-gray-200">{job.name}</h3>
              {stalled
                ? <span className="ui-status ui-status-danger">{heartbeat === 'error' ? 'Probe error' : 'Stalled'}</span>
                : heartbeat === 'unavailable'
                  ? <span className="ui-status ui-status-neutral">Restart window</span>
                  : <StatusBadge ok={job.enabled} on="Active" off="Off" />}
            </div>
            <p className="mt-2 min-h-10 text-sm leading-5 text-gray-600">{job.description}</p>
            <div className="mt-4 space-y-2 border-t border-white/[0.05] pt-3 text-xs text-gray-500">
              <div className="flex justify-between gap-3"><span>Next run</span><span>{formatDate(job.next_run)}</span></div>
              <div className="flex justify-between gap-3">
                <span>Last result</span>
                {stalled
                  ? <span className="text-red-400">
                      {heartbeat === 'error' ? 'Heartbeat probe failing' : 'Log pipeline stalled'}
                    </span>
                  : <span className={statusColor(job.last_status)}>{job.last_status ?? 'Never'}</span>}
              </div>
              {job.last_detail && <div className="truncate text-right text-gray-600" title={job.last_detail}>{job.last_detail}</div>}
            </div>

            {stalled && (
              <p className="mt-3 text-xs leading-5 text-red-300/80">
                The game may still be running, but the panel cannot read its log,
                so status, players and console output are stale. Recovery: run{' '}
                <span className="font-mono">save</span>, then{' '}
                <span className="font-mono">docker compose restart terraria</span>.
              </p>
            )}

            <button type="button" onClick={() => onRun(job.name)} disabled={!job.enabled || Boolean(action)} className="ui-button ui-button-secondary mt-4 w-full">
              <Play size={15} /> {action === `schedule:${job.name}` ? 'Running...' : 'Run now'}
            </button>
          </div>
        )
      })}
    </div>
  </div>
}

function GuardView({ guard, loading, action, onAction, onRemove }: { guard: GuardResponse | null; loading: boolean; action: string; onAction: (key: string, operation: () => Promise<unknown>) => void; onRemove: (kind: 'allow' | 'ban', ip: string) => void }) {
  const [ip, setIp] = useState('')
  const [mode, setMode] = useState<'allow' | 'ban'>('allow')
  if (loading && !guard) return <EmptyState text="Loading guard state..." />
  if (!guard) return <EmptyState text="Guard status is unavailable." />

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = ip.trim()
    if (!value) return
    onAction(`${mode}:${value}`, () => mode === 'allow' ? allowIp(value) : banIp(value))
    setIp('')
  }

  return <div className="space-y-5">
    <div className="ui-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className={guard.available && !guard.stale ? 'text-emerald-400' : 'text-red-400'}>{guard.available ? <ShieldCheck size={22} /> : <ShieldX size={22} />}</div><div><div className="font-medium text-gray-200">{guard.available ? guard.stale ? 'Guard state is stale' : 'Guard is running' : 'Guard is stopped'}</div><div className="mt-0.5 text-xs text-gray-600">Port {guard.port ?? '-'} · {guard.allowlist_only ? 'Allowlist only' : 'Automatic protection'}</div></div></div>
      <button type="button" onClick={() => onAction('guard-reload', reloadGuard)} disabled={!guard.available || Boolean(action)} className="ui-button ui-button-secondary"><RefreshCw size={15} /> Reload</button>
    </div>

    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <div className="flex rounded-lg border border-white/[0.07] bg-white/[0.025] p-1">
        {(['allow', 'ban'] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={["rounded-md px-3 py-2 text-sm capitalize", mode === item ? 'bg-white/[0.08] text-gray-100' : 'text-gray-600'].join(' ')}>{item}</button>)}
      </div>
      <input value={ip} onChange={(event) => setIp(event.target.value)} placeholder="IP address" className="ui-input min-w-0 flex-1 px-3 py-2.5 text-sm" />
      <button type="submit" disabled={!guard.available || !ip.trim() || Boolean(action)} className="ui-button ui-button-accent">{mode === 'allow' ? <ShieldCheck size={15} /> : <ShieldX size={15} />} Add {mode}</button>
    </form>

    <div className="grid gap-5 lg:grid-cols-2">
      <GuardList title="Allowed IPs" empty="No allowed addresses." entries={guard.allow.map((entry) => ({ ip: entry.ip, detail: `${entry.source}${entry.expires_at ? ` · expires ${formatDate(entry.expires_at)}` : ''}` }))} action={action} onRemove={(value) => onRemove('allow', value)} />
      <GuardList title="Banned IPs" empty="No banned addresses." entries={guard.banned.map((entry) => ({ ip: entry.ip, detail: entry.expires_at ? `expires ${formatDate(entry.expires_at)}` : 'No expiry' }))} action={action} onRemove={(value) => onRemove('ban', value)} />
    </div>
  </div>
}

function GuardList({ title, empty, entries, action, onRemove }: { title: string; empty: string; entries: Array<{ ip: string; detail: string }>; action: string; onRemove: (ip: string) => void }) {
  return <section><h3 className="mb-2 text-sm font-medium text-gray-300">{title}</h3><div className="ui-scroll-region divide-y divide-white/[0.05] border-y border-white/[0.07] pr-1">
    {entries.length ? entries.map((entry) => <div key={entry.ip} className="flex items-center justify-between gap-3 py-3"><div><div className="font-mono text-sm text-gray-300">{entry.ip}</div><div className="mt-0.5 text-xs text-gray-600">{entry.detail}</div></div><button type="button" onClick={() => onRemove(entry.ip)} disabled={Boolean(action)} className="ui-icon-button h-8 w-8" title={`Remove ${entry.ip}`}><Trash2 size={14} /></button></div>) : <div className="py-6 text-center text-sm text-gray-600">{empty}</div>}
  </div></section>
}

function NotificationsView({
  notifications,
  loading,
  testing,
  canEdit,
  saving,
  resetting,
  busy,
  onTest,
  onSave,
  onReset,
}: {
  notifications: NotificationsResponse | null
  loading: boolean
  testing: boolean
  canEdit: boolean
  saving: boolean
  resetting: boolean
  busy: boolean
  onTest: () => void
  onSave: (patch: NotificationSettingsUpdate) => Promise<boolean>
  onReset: () => Promise<boolean>
}) {
  const [formKey, setFormKey] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)

  if (loading && !notifications) return <EmptyState text="Loading notifications..." />
  if (!notifications) return <EmptyState text="Notification status is unavailable." />

  const missing = notifications.missing ?? []

  return <div className="space-y-5">
    <div className="ui-panel p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge ok={notifications.enabled} on="Enabled" off="Disabled" />
            <span className="text-sm text-gray-400">{notifications.format}</span>
            {/* env = still on NOTIFY_* defaults; file = saved from the panel */}
            <span className="ui-status ui-status-neutral">
              {notifications.source === 'file' ? 'Saved in panel' : 'Env defaults'}
            </span>
          </div>

          <div className="mt-2 truncate text-sm text-gray-600">
            {notifications.provider === 'none'
              ? 'Notifications are switched off (credentials kept).'
              : notifications.url || 'No webhook configured'}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onTest}
            disabled={!notifications.enabled || testing || busy}
            className="ui-button ui-button-accent"
          >
            <Bell size={15} /> {testing ? 'Sending...' : 'Send test'}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={notifications.source !== 'file' || busy}
              title={notifications.source === 'file'
                ? 'Delete the saved config and fall back to NOTIFY_* env vars'
                : 'Already using the environment defaults'}
              className="ui-button ui-button-secondary"
            >
              <RotateCcw size={15} /> {resetting ? 'Resetting...' : 'Reset to env'}
            </button>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-300">
          Still missing before delivery can work:{' '}
          <span className="font-mono">{missing.join(', ')}</span>
        </div>
      )}
    </div>

    {canEdit ? (
      <NotificationSettingsForm
        key={formKey}
        notifications={notifications}
        saving={saving}
        busy={busy}
        onSave={async (patch) => {
          const ok = await onSave(patch)
          if (ok) setFormKey((current) => current + 1)
          return ok
        }}
      />
    ) : (
      <div className="ui-panel-subtle px-4 py-3 text-xs text-gray-500">
        This backend does not advertise <span className="font-mono">notifications.settings</span>,
        so the target can only be changed through the server&apos;s environment variables.
      </div>
    )}

    <section>
      <h3 className="mb-2 text-sm font-medium text-gray-300">Recent deliveries</h3>
      <div className="ui-scroll-region divide-y divide-white/[0.05] border-y border-white/[0.07] pr-1">
        {notifications.deliveries.length
          ? notifications.deliveries.map((delivery) => (
              <DeliveryRow key={`${delivery.ts}-${delivery.event}`} delivery={delivery} />
            ))
          : <div className="py-6 text-center text-sm text-gray-600">No deliveries recorded.</div>}
      </div>
    </section>

    <ConfirmDialog
      open={confirmReset}
      onOpenChange={(open) => {
        if (!open && !busy) setConfirmReset(false)
      }}
      title="Reset notification settings"
      description="Delete the configuration saved in the panel and fall back to the server's NOTIFY_* environment variables? The saved webhook URL and QQ credentials are discarded."
      confirmText="Reset to env"
      onConfirm={async () => {
        const ok = await onReset()
        if (ok) {
          setConfirmReset(false)
          setFormKey((current) => current + 1)
        }
      }}
      loading={resetting}
    />
  </div>
}

/** `events` arrives as `all`, a comma string, or an array. */
function parseEvents(events: string | string[]): string[] {
  if (Array.isArray(events)) return events

  const value = events.trim()

  if (!value || value === 'all') return []

  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

/**
 * Editable notification target.
 *
 * Only fields the user actually touched are sent: the API merges, so omitted
 * fields keep their stored value. That matters because the panel never
 * receives real credentials — `url` comes back host-only and
 * `qq.client_secret` as a mask — so echoing them back would be wrong.
 */
function NotificationSettingsForm({
  notifications,
  saving,
  busy,
  onSave,
}: {
  notifications: NotificationsResponse
  saving: boolean
  busy: boolean
  onSave: (patch: NotificationSettingsUpdate) => Promise<boolean>
}) {
  const [provider, setProvider] = useState(notifications.provider)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(() => parseEvents(notifications.events))
  const [appId, setAppId] = useState(notifications.qq?.app_id ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [channelId, setChannelId] = useState(notifications.qq?.channel_id ?? '')
  const [sandbox, setSandbox] = useState(notifications.qq?.sandbox ?? false)
  const [apiBase, setApiBase] = useState('')
  const [tokenUrl, setTokenUrl] = useState('')
  const [touched, setTouched] = useState<Set<string>>(() => new Set())

  function mark(field: string) {
    setTouched((current) => new Set(current).add(field))
  }

  function toggleEvent(name: string) {
    mark('events')
    setEvents((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    )
  }

  function buildPatch(): NotificationSettingsUpdate {
    const patch: NotificationSettingsUpdate = {}

    if (touched.has('provider')) patch.provider = provider
    // "" clears the stored URL; the API treats a mask as "keep".
    if (touched.has('url')) patch.url = url

    if (touched.has('events')) {
      // No selection means "all events" per the contract.
      patch.events = events.join(',')
    }

    const qq: NotificationQQUpdate = {}
    if (touched.has('qq.app_id')) qq.app_id = appId
    if (touched.has('qq.client_secret')) qq.client_secret = clientSecret
    if (touched.has('qq.channel_id')) qq.channel_id = channelId
    if (touched.has('qq.sandbox')) qq.sandbox = sandbox
    if (touched.has('qq.api_base')) qq.api_base = apiBase
    if (touched.has('qq.token_url')) qq.token_url = tokenUrl
    if (Object.keys(qq).length) patch.qq = qq

    return patch
  }

  const dirty = touched.size > 0
  const isQq = provider === 'qq'
  const urlSet = notifications.url_set
  const secretSet = notifications.qq?.client_secret_set

  const rowClass = 'grid gap-1.5'
  const labelClass = 'text-xs font-medium text-gray-500'
  const inputClass = 'ui-input px-3 py-2.5 text-sm'

  return (
    <section className="ui-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-300">Delivery target</h3>
        {dirty && (
          <span className="text-[11px] text-amber-400">
            {touched.size} unsaved change{touched.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={rowClass}>
          <span className={labelClass}>Channel</span>
          <select
            value={provider}
            onChange={(event) => {
              mark('provider')
              setProvider(event.target.value)
            }}
            className={inputClass}
          >
            {NOTIFICATION_PROVIDERS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        {!isQq && (
          <div className={rowClass}>
            <label className="grid gap-1.5">
              <span className={labelClass}>
                Webhook URL
                {urlSet && <span className="ml-2 text-gray-600">currently set</span>}
              </span>
              <input
                type="text"
                value={url}
                onChange={(event) => {
                  mark('url')
                  setUrl(event.target.value)
                }}
                placeholder={urlSet
                  ? 'Leave blank to keep the saved URL'
                  : 'https://open.feishu.cn/open-apis/bot/v2/hook/…'}
                className={inputClass}
              />
            </label>

            {/* The field starts blank because the API only echoes the host,
                and Save is disabled until something is touched — so without
                this, "clear it to remove the saved URL" was unreachable. */}
            <span className="flex items-start justify-between gap-2 text-[11px] text-gray-600">
              <span>
                The API only ever echoes the host, so the field starts blank.
                Blank keeps the saved value.
              </span>

              {urlSet && (
                <button
                  type="button"
                  onClick={() => {
                    mark('url')
                    setUrl('')
                  }}
                  className="shrink-0 text-amber-400 transition hover:text-amber-300"
                >
                  Remove saved URL
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      {isQq && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={rowClass}>
            <span className={labelClass}>App ID</span>
            <input
              type="text"
              value={appId}
              onChange={(event) => {
                mark('qq.app_id')
                setAppId(event.target.value)
              }}
              placeholder="102xxxxx"
              className={inputClass}
            />
          </label>

          <label className={rowClass}>
            <span className={labelClass}>
              Client secret
              {secretSet && <span className="ml-2 text-gray-600">currently set</span>}
            </span>
            <input
              type="password"
              value={clientSecret}
              onChange={(event) => {
                mark('qq.client_secret')
                setClientSecret(event.target.value)
              }}
              placeholder={secretSet ? 'Leave blank to keep the saved secret' : 'Client secret'}
              className={inputClass}
            />
          </label>

          <label className={rowClass}>
            <span className={labelClass}>Channel ID</span>
            <input
              type="text"
              value={channelId}
              onChange={(event) => {
                mark('qq.channel_id')
                setChannelId(event.target.value)
              }}
              placeholder="1234567"
              className={inputClass}
            />
          </label>

          <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(event) => {
                mark('qq.sandbox')
                setSandbox(event.target.checked)
              }}
              className="accent-emerald-500"
            />
            Sandbox environment
          </label>

          <label className={rowClass}>
            <span className={labelClass}>API base override</span>
            <input
              type="text"
              value={apiBase}
              onChange={(event) => {
                mark('qq.api_base')
                setApiBase(event.target.value)
              }}
              placeholder="https://api.bot.qq.com"
              className={inputClass}
            />
          </label>

          <label className={rowClass}>
            <span className={labelClass}>Token URL override</span>
            <input
              type="text"
              value={tokenUrl}
              onChange={(event) => {
                mark('qq.token_url')
                setTokenUrl(event.target.value)
              }}
              placeholder="https://api.bot.qq.com/app/getAppAccessToken"
              className={inputClass}
            />
          </label>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className={labelClass}>Events</span>
          <span className="text-[11px] text-gray-600">
            {events.length === 0 ? 'All events' : `${events.length} selected`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_EVENTS.map((name) => {
            const active = events.includes(name)
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleEvent(name)}
                className={[
                  'rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition',
                  active
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/[0.07] bg-white/[0.025] text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                {name}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-600">
          Selecting nothing means every event. QQ channel bots are rate limited
          (about 20 proactive messages per sub-channel per day), so a low-volume
          set such as{' '}
          <span className="font-mono">log_stalled, schedule_failed, server_error</span>{' '}
          is usually a better fit there.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => void onSave(buildPatch())}
          className="ui-button ui-button-accent"
        >
          <Check size={15} /> {saving ? 'Saving...' : 'Save target'}
        </button>
      </div>
    </section>
  )
}

/**
 * Notification events carry their own severity: a failed *delivery* and a
 * stalled-log *event* are different kinds of bad, and the second one
 * means the panel has lost the log pipeline.
 *
 * API 2.0.0 renamed `console_stalled` to `log_stalled`; both names are
 * mapped so a panel talking to an older backend still flags it.
 */
const EVENT_SEVERITY: Record<string, { label: string; tone: 'error' | 'warning' | 'info' }> = {
  log_stalled: { label: 'Log pipeline stalled', tone: 'error' },
  console_stalled: { label: 'Log pipeline stalled', tone: 'error' },
  server_error: { label: 'Server error', tone: 'error' },
  schedule_failed: { label: 'Scheduled task failed', tone: 'error' },
  restart_skipped: { label: 'Restart skipped', tone: 'warning' },
  player_booted: { label: 'Connection rejected', tone: 'warning' },
  player_join: { label: 'Player joined', tone: 'info' },
  player_leave: { label: 'Player left', tone: 'info' },
  server_up: { label: 'Server up', tone: 'info' },
  backup_done: { label: 'Backup completed', tone: 'info' },
}

const EVENT_TONE_CLASSES = {
  error: 'text-red-400 border-red-500/25 bg-red-500/[0.06]',
  warning: 'text-amber-400 border-amber-500/25 bg-amber-500/[0.06]',
  info: 'text-gray-500 border-white/[0.08] bg-white/[0.02]',
} as const

function DeliveryRow({ delivery }: { delivery: NotificationDelivery }) {
  const event = EVENT_SEVERITY[delivery.event]
  const tone = event?.tone ?? 'info'

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={delivery.ok ? 'mt-0.5 text-emerald-400' : 'mt-0.5 text-red-400'}>
        {delivery.ok ? <Check size={15} /> : <ShieldX size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-gray-300">{delivery.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${EVENT_TONE_CLASSES[tone]}`}>
            {delivery.event}
          </span>
          {event && (
            <span className={`text-[11px] ${tone === 'info' ? 'text-gray-600' : ''} ${tone === 'error' ? 'text-red-400' : ''} ${tone === 'warning' ? 'text-amber-400' : ''}`}>
              {event.label}
            </span>
          )}
          <span className="text-xs text-gray-600">
            {formatDate(delivery.ts)}{delivery.status ? ` · HTTP ${delivery.status}` : ''}
          </span>
        </div>
        {delivery.error && <div className="mt-1 text-xs text-red-400">{delivery.error}</div>}
      </div>
    </div>
  )
}

/**
 * The documented response has a top-level `submitted: <operation_id>`, but
 * the backend currently only puts it inside `detail` as
 * "submitted: <id>" (terraria-server issue #10). Reading both means the
 * panel shows real progress today and keeps working once the field is
 * added — without this, a restart job looks "finished" the instant it is
 * accepted, while the server is only just starting to restart.
 */
function getSubmittedOperationId(
  result: Record<string, unknown>,
): string | null {
  if (typeof result.submitted === 'string' && result.submitted !== '') {
    return result.submitted
  }

  const detail = result.detail

  if (typeof detail !== 'string') {
    return null
  }

  const match = /^submitted:\s*(\S+)/.exec(detail.trim())

  return match?.[1] ?? null
}

function EmptyState({ text }: { text: string }) {
  return <div className="ui-panel py-12 text-center text-sm text-gray-600">{text}</div>
}

const OPERATION_STATE_CLASSES: Record<string, string> = {
  succeeded: 'text-emerald-400',
  failed: 'text-red-400',
  running: 'text-cyan-300',
  pending: 'text-amber-400',
}

/**
 * Recent long-running operations. The backend keeps the last 50 in API
 * process memory, so this list empties whenever the API restarts.
 */
function OperationsHistoryView({ operations, loading, failed, onRefresh }: { operations: Operation[]; loading: boolean; failed: boolean; onRefresh: () => Promise<void> }) {
  if (loading && !operations.length) return <EmptyState text="Loading operations..." />
  if (!operations.length) {
    return <div className="space-y-3">
      <EmptyState text={failed
        ? 'Could not load operations. The API may be restarting, or the list is briefly unavailable.'
        : 'No operations recorded. The API restarts clear this list.'} />
      <button type="button" onClick={() => void onRefresh()} className="ui-button ui-button-secondary w-full">
        <RefreshCw size={15} /> Refresh
      </button>
    </div>
  }

  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
      <span>{failed
        ? 'Could not refresh — showing the last list that loaded.'
        : 'Refreshes automatically every few seconds.'}</span>
      <button type="button" onClick={() => void onRefresh()} className="ui-button ui-button-secondary">
        <RefreshCw size={14} /> Refresh
      </button>
    </div>

    <div className="ui-scroll-region space-y-2 pr-1">
    {operations.map((operation) => {
      const progress = Math.max(0, Math.min(100, operation.progress ?? 0))
      const stateClass = OPERATION_STATE_CLASSES[operation.state] ?? 'text-gray-500'

      return <div key={operation.id} className="ui-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`text-sm font-medium capitalize ${stateClass}`}>{operation.state}</span>
            <span className="truncate font-mono text-xs text-gray-500">{operation.kind}</span>
            <span className="font-mono text-[11px] text-gray-700">{operation.id}</span>
          </div>
          <span className="text-xs text-gray-600">{formatDuration(operation)}</span>
        </div>

        {operation.state === 'running' || operation.state === 'pending' ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-gray-600">
              <span>{operation.message || 'In progress'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full bg-emerald-400/70 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
          <div>Started {formatDate(operation.started_at ?? operation.created_at)}</div>
          <div>Finished {formatDate(operation.finished_at)}</div>
        </div>

        {operation.message && (operation.state === 'succeeded' || operation.state === 'failed') &&
          <div className="mt-2 text-xs text-gray-500">{operation.message}</div>}
        {operation.error && <div className="mt-2 text-xs text-red-400">{operation.error}</div>}
      </div>
    })}
    </div>
  </div>
}

function formatDuration(operation: Operation) {
  const start = operation.started_at ?? operation.created_at
  const end = operation.finished_at

  if (!start || !end) return 'in progress'

  const seconds = Math.max(0, end - start)

  if (seconds < 60) return `${seconds.toFixed(1)}s`

  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

function StatusBadge({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return <span className={`ui-status ${ok ? 'ui-status-success' : 'ui-status-neutral'}`}>{ok ? on : off}</span>
}

function statusColor(status: string | null) {
  if (status === 'succeeded') return 'text-emerald-400'
  if (status === 'failed') return 'text-red-400'
  if (status === 'skipped') return 'text-amber-400'
  return 'text-gray-600'
}

function formatDate(value: number | null) {
  if (!value) return '-'
  return new Date(value * 1000).toLocaleString()
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getBackupFileCount(files: number) {
  return files
}


