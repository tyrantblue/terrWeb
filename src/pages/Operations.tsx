import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import {
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
  allowIp,
  banIp,
  getBackups,
  getGuard,
  getNotifications,
  getScheduler,
  reloadGuard,
  removeAllowedIp,
  restoreBackup,
  runSchedule,
  testNotifications,
  unbanIp,
  type Backup,
  type BackupsResponse,
  type GuardResponse,
  type NotificationsResponse,
  type SchedulerResponse,
} from '../api/operations'
import { ApiError } from '../api/client'
import { waitForOperation } from '../api/world'
import ConfirmDialog from '../components/ConfirmDialog'

type OperationsTab =
  | 'backups'
  | 'scheduler'
  | 'guard'
  | 'notifications'

const tabs: Array<{
  id: OperationsTab
  label: string
  icon: typeof ArchiveRestore
}> = [
  { id: 'backups', label: 'Backups', icon: ArchiveRestore },
  { id: 'scheduler', label: 'Scheduler', icon: CalendarClock },
  { id: 'guard', label: 'Guard', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function Operations() {
  const [activeTab, setActiveTab] = useState<OperationsTab>('backups')
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
      const operation = await restoreBackup(
        restoreTarget.name,
        restoreFile || undefined,
      )
      await waitForOperation(operation.operation_id, (current) => {
        setMessage(current.message ?? `Restoring ${restoreTarget.name}... ${current.progress ?? 0}%`)
      })
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

      setMessage(getErrorMessage(error))
    } finally {
      setAction('')
    }
  }

  async function handleSchedule(name: string) {
    try {
      setAction(`schedule:${name}`)
      setMessage(`Running ${name}...`)
      const result = await runSchedule(name)
      const submitted = result.submitted

      if (typeof submitted === 'string') {
        await waitForOperation(
          submitted,
          (current) => {
            setMessage(
              current.message ??
                `Running ${name}... ${current.progress ?? 0}%`,
            )
          },
        )
      }

      setMessage(`${name} finished.`)
      setScheduler(await getScheduler())
      return true
    } catch (error) {
      setMessage(getErrorMessage(error))
      return false
    } finally {
      setAction('')
    }
  }

  function requestSchedule(name: string) {
    if (name === 'restart') {
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
      setMessage(getErrorMessage(error))
      return false
    } finally {
      setAction('')
    }
  }

  function requestGuardRemoval(
    kind: 'allow' | 'ban',
    ip: string,
  ) {
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

  async function handleNotificationTest() {
    try {
      setAction('notification-test')
      const result = await testNotifications()
      setMessage(result.ok ? 'Test notification delivered.' : result.error ?? 'Test delivery failed.')
      setNotifications(await getNotifications())
    } catch (error) {
      setMessage(getErrorMessage(error))
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

      {message && <div className="ui-panel-subtle px-4 py-3 text-sm text-gray-400">{message}</div>}

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
        <BackupsView backups={backups?.backups ?? []} loading={loading} action={action} onRestore={setRestoreTarget} />
      )}
      {activeTab === 'scheduler' && (
        <SchedulerView scheduler={scheduler} loading={loading} action={action} onRun={requestSchedule} />
      )}
      {activeTab === 'guard' && (
        <GuardView guard={guard} loading={loading} action={action} onAction={handleGuardAction} onRemove={requestGuardRemoval} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsView notifications={notifications} loading={loading} testing={action === 'notification-test'} onTest={handleNotificationTest} />
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
      />
    </div>
  )
}

function BackupsView({ backups, loading, action, onRestore }: { backups: Backup[]; loading: boolean; action: string; onRestore: (backup: Backup) => void }) {
  if (loading && !backups.length) return <EmptyState text="Loading backups..." />
  if (!backups.length) return <EmptyState text="No backups available." />

  return <div className="grid gap-3 lg:grid-cols-2">
    {backups.map((backup) => (
      <div key={backup.name} className="ui-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-200">{backup.name}</div>
            <div className="mt-1 text-xs text-gray-600">{formatDate(backup.created_at)} · {formatSize(backup.size)} · {getBackupFileCount(backup.files)} file(s)</div>
          </div>
          <span className="ui-status ui-status-neutral uppercase">{backup.kind}</span>
        </div>
        <button type="button" onClick={() => onRestore(backup)} disabled={!backup.restorable || Boolean(action)} className="ui-button ui-button-accent mt-4 w-full">
          <RotateCcw size={15} /> {backup.restorable ? 'Restore backup' : 'Not restorable'}
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
    <div className="grid gap-3 lg:grid-cols-3">
      {scheduler.jobs.map((job) => (
        <div key={job.name} className="ui-panel p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="font-medium capitalize text-gray-200">{job.name}</h3><StatusBadge ok={job.enabled} on="Active" off="Off" /></div>
          <p className="mt-2 min-h-10 text-sm leading-5 text-gray-600">{job.description}</p>
          <div className="mt-4 space-y-2 border-t border-white/[0.05] pt-3 text-xs text-gray-500">
            <div className="flex justify-between gap-3"><span>Next run</span><span>{formatDate(job.next_run)}</span></div>
            <div className="flex justify-between gap-3"><span>Last result</span><span className={statusColor(job.last_status)}>{job.last_status ?? 'Never'}</span></div>
            {job.last_detail && <div className="truncate text-right text-gray-600" title={job.last_detail}>{job.last_detail}</div>}
          </div>
          <button type="button" onClick={() => onRun(job.name)} disabled={!job.enabled || Boolean(action)} className="ui-button ui-button-secondary mt-4 w-full">
            <Play size={15} /> {action === `schedule:${job.name}` ? 'Running...' : 'Run now'}
          </button>
        </div>
      ))}
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
  return <section><h3 className="mb-2 text-sm font-medium text-gray-300">{title}</h3><div className="divide-y divide-white/[0.05] border-y border-white/[0.07]">
    {entries.length ? entries.map((entry) => <div key={entry.ip} className="flex items-center justify-between gap-3 py-3"><div><div className="font-mono text-sm text-gray-300">{entry.ip}</div><div className="mt-0.5 text-xs text-gray-600">{entry.detail}</div></div><button type="button" onClick={() => onRemove(entry.ip)} disabled={Boolean(action)} className="ui-icon-button h-8 w-8" title={`Remove ${entry.ip}`}><Trash2 size={14} /></button></div>) : <div className="py-6 text-center text-sm text-gray-600">{empty}</div>}
  </div></section>
}

function NotificationsView({ notifications, loading, testing, onTest }: { notifications: NotificationsResponse | null; loading: boolean; testing: boolean; onTest: () => void }) {
  if (loading && !notifications) return <EmptyState text="Loading notifications..." />
  if (!notifications) return <EmptyState text="Notification status is unavailable." />
  return <div className="space-y-5">
    <div className="ui-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><StatusBadge ok={notifications.enabled} on="Enabled" off="Disabled" /><span className="text-sm text-gray-400">{notifications.format}</span></div><div className="mt-2 text-sm text-gray-600">{notifications.url ?? 'No webhook configured'}</div></div><button type="button" onClick={onTest} disabled={!notifications.enabled || testing} className="ui-button ui-button-accent"><Bell size={15} /> {testing ? 'Sending...' : 'Send test'}</button></div>
    <section><h3 className="mb-2 text-sm font-medium text-gray-300">Recent deliveries</h3><div className="divide-y divide-white/[0.05] border-y border-white/[0.07]">
      {notifications.deliveries.length ? notifications.deliveries.map((delivery) => <div key={`${delivery.ts}-${delivery.event}`} className="flex items-start gap-3 py-3"><div className={delivery.ok ? 'mt-0.5 text-emerald-400' : 'mt-0.5 text-red-400'}>{delivery.ok ? <Check size={15} /> : <ShieldX size={15} />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm text-gray-300">{delivery.title}</div><div className="mt-0.5 text-xs text-gray-600">{delivery.event} · {formatDate(delivery.ts)}{delivery.status ? ` · HTTP ${delivery.status}` : ''}</div>{delivery.error && <div className="mt-1 text-xs text-red-400">{delivery.error}</div>}</div></div>) : <div className="py-6 text-center text-sm text-gray-600">No deliveries recorded.</div>}
    </div></section>
  </div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="ui-panel py-12 text-center text-sm text-gray-600">{text}</div>
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Operation failed.'
}
