import {
  useState,
} from 'react'

import {
  Activity,
  Clock,
  Database,
  Moon,
  Power,
  Save,
  Server,
  Sun,
  TriangleAlert,
  Users,
} from 'lucide-react'

import {
  restartServer,
  saveServer,
  setTime,
  type ServerTime,
} from '../api/server'
import { runOperation } from '../api/world'
import { useConsoleHeartbeat } from '../context/consoleHeartbeat'
import { useOperations } from '../context/operations'
import { useAbortOnUnmount } from '../hooks/useAbortOnUnmount'
import { formatErrorReport } from '../api/errors'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  useServerStatus,
  type Connectivity,
} from '../context/serverStatus'


export default function Dashboard() {
  const { status, connectivity, refresh } =
    useServerStatus()

  const heartbeat = useConsoleHeartbeat()

  const { activeExclusive } = useOperations()

  const operationAbort = useAbortOnUnmount()

  // `stalled` is the pipeline being dead; `error` is the probe itself
  // failing. `log_stalled` is the API 2.0.0+ flag on the server status,
  // which is the same signal but refreshed with the 5s status poll rather
  // than the 60s heartbeat job.
  const heartbeatFault =
    heartbeat.state === 'stalled' ||
    heartbeat.state === 'error' ||
    status?.log_stalled === true

  const [action, setAction] =
    useState<string | null>(null)

  const [message, setMessage] =
    useState('')

  const [confirmRestart, setConfirmRestart] =
    useState(false)


  async function handleRestart() {
    try {
      setAction('restart')
      setMessage('Restarting the server...')

      await runOperation(restartServer, {
        // A running restart means the user's intent is already being
        // carried out, so follow it instead of failing.
        adoptKind: 'server.restart',
        signal: operationAbort.current?.signal,
        onProgress: (current) => {
          setMessage(
            current.message ??
              `Restarting... ${current.progress}%`,
          )
        },
        onAdopt: () => {
          setMessage(
            'A restart is already running — following it.',
          )
        },
      })

      setConfirmRestart(false)
      setMessage('Server restarted.')

      await refresh()
    } catch (error) {
      console.error(error)

      setMessage(`Restart failed. ${formatErrorReport(error)}`)
    } finally {
      setAction(null)
    }
  }


  async function handleSave() {
    try {
      setAction('save')
      setMessage('Saving world...')

      await saveServer()

      setMessage(
        'World saved successfully.',
      )

      await refresh()
    } catch (error) {
      console.error(error)

      setMessage(formatErrorReport(error))
    } finally {
      setAction(null)
    }
  }


  async function handleTime(
    time: ServerTime,
  ) {
    try {
      setAction(time)

      setMessage(
        `Changing time to ${formatTimeName(time)}...`,
      )

      await setTime(time)

      setMessage(
        `Time changed to ${formatTimeName(time)}.`,
      )

      await refresh()
    } catch (error) {
      console.error(error)

      setMessage(formatErrorReport(error))
    } finally {
      setAction(null)
    }
  }


  const online =
    status?.players.online ?? 0

  const maxPlayers =
    status?.max_players ?? null

  // `connectivity` is derived once in the status provider so the layout
  // header and this page can never disagree about the server state.
  const connectivityLabel = connectivity === 'connecting'
    ? 'Connecting...'
    : connectivity === 'unreachable'
      ? 'API Unreachable'
      : connectivity === 'online'
        ? 'Server Online'
        : 'Server Offline'

  const connectivityTone = CONNECTIVITY_TONES[connectivity]


  return (
    <div className="space-y-6">

      {/* Header / Server status */}
      <section
        className={[
          'relative overflow-hidden',
          'ui-panel',
          'p-6',
        ].join(' ')}
      >

        <div
          className={[
            'pointer-events-none',
            'absolute -right-24 -top-24',
            'h-64 w-64',
            'rounded-full',
            'bg-emerald-400/[0.035]',
            'blur-3xl',
          ].join(' ')}
        />


        <div
          className={[
            'relative',
            'flex flex-col gap-5',
            'sm:flex-row',
            'sm:items-center',
            'sm:justify-between',
          ].join(' ')}
        >

          <div>

            <div className="flex items-center gap-3">

              <div
              className={[
                  'ui-icon-tile',
                  'h-11 w-11',
                ].join(' ')}
              >
                <Server
                  size={21}
                  strokeWidth={1.8}
                />
              </div>

              <div>

                <h2
                  className={[
                    'ui-page-title',
                  ].join(' ')}
                >
                  Dashboard
                </h2>

                <p className="ui-page-description">
                  Terraria server overview
                </p>

              </div>

            </div>

          </div>


          <div
            className={[
              'inline-flex items-center',
              'gap-2.5',
              'self-start sm:self-auto',
              'rounded-full',
              'border',
              connectivityTone.border,
              connectivityTone.bg,
              'px-3.5 py-2',
            ].join(' ')}
          >

            <span
              className={[
                'h-2 w-2',
                'rounded-full',
                connectivityTone.dot,
              ].join(' ')}
            />

            <span
              className={[
                'text-sm font-medium',
                connectivityTone.text,
              ].join(' ')}
            >
              {connectivityLabel}
            </span>

          </div>

        </div>

      </section>


      {/* Status message */}
      {/* The heartbeat job reports success even when the log pipeline is
          stalled, so this alert is the only place the Dashboard can tell
          the operator that the panel has gone blind. */}
      {heartbeatFault && (
        <div
          role="alert"
          className={[
            'rounded-lg',
            'border border-red-500/20',
            'bg-red-500/[0.07]',
            'px-4 py-3',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-red-300">
            <TriangleAlert size={15} />
            {heartbeat.state === 'error'
              ? 'The heartbeat probe is failing'
              : 'The panel can no longer read the server log'}
          </div>

          <div className="mt-1.5 text-xs text-red-300/80">
            {heartbeat.detail || (typeof status?.log_age === 'number'
              ? `The server log has not advanced for ${Math.round(status.log_age)}s.`
              : '')}
          </div>

          <div className="mt-1.5 text-xs text-red-300/70">
            Recovery: run <span className="font-mono">save</span>, then restart the
            Terraria container (<span className="font-mono">docker compose restart terraria</span>).
            {' '}Server status shown here is the last value the panel managed to read.
          </div>
        </div>
      )}

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'flex items-center',
            'rounded-lg',
            'border border-white/[0.07]',
            'bg-white/[0.025]',
            'px-4 py-3',
            'text-sm text-gray-500',
          ].join(' ')}
        >
          {message}
        </div>
      )}


      {/* Core statistics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={<Activity size={18} />}
          label="Status"
          value={
            connectivity === 'connecting'
              ? '—'
              : connectivity === 'unreachable'
                ? 'Unreachable'
                : connectivity === 'online'
                  ? 'Online'
                  : 'Stopped'
          }
          accent={
            connectivity === 'online'
              ? 'green'
              : connectivity === 'offline'
                ? 'amber'
                : 'red'
          }
        />

        <StatCard
          icon={<Server size={18} />}
          label="Version"
          value={
            status?.version ?? '—'
          }
        />

        <StatCard
          icon={<Users size={18} />}
          label="Players"
          value={
            status
              ? `${online} / ${maxPlayers ?? '—'}`
              : '—'
          }
        />

        <StatCard
          icon={<Clock size={18} />}
          label="World Time"
          value={
            status?.time ?? '—'
          }
        />

      </div>


      {/* Information */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Server information */}
        <Panel
          title="Server Information"
          icon={<Server size={17} />}
        >

          <div className="space-y-0">

            <InfoRow
              label="Version"
              value={
                status?.version ?? '—'
              }
            />

            <InfoRow
              label="Port"
              value={
                status
                  ? String(status.port)
                  : '—'
              }
            />

            <InfoRow
              label="Max Players"
              value={
                status
                  ? String(status.max_players)
                  : '—'
              }
            />

            <InfoRow
              label="World Seed"
              value={
                status?.seed ?? '—'
              }
            />

            <InfoRow
              label="MOTD"
              value={
                status?.motd ?? '—'
              }
            />

          </div>

        </Panel>


        {/* Players */}
        <Panel
          title="Players"
          icon={<Users size={17} />}
          trailing={
            <span
              className={[
                'rounded-full',
                'bg-white/[0.05]',
                'px-2.5 py-1',
                'text-xs',
                'text-gray-500',
              ].join(' ')}
            >
              {online} / {maxPlayers ?? '—'}
            </span>
          }
        >

          {status?.players.players.length ? (

            <div className="space-y-2">

              {status.players.players.map(
                (player) => (
                  <div
                    key={player.name}
                    className={[
                      'flex items-center',
                      'rounded-lg',
                      'border border-white/[0.05]',
                      'bg-white/[0.025]',
                      'px-3.5 py-3',
                      'transition',
                      'hover:bg-white/[0.04]',
                    ].join(' ')}
                  >

                    <div className="flex items-center gap-3">

                      <span
                        className={[
                          'h-2 w-2',
                          'rounded-full',
                          'bg-emerald-400',
                        ].join(' ')}
                      />

                      <span className="text-sm text-gray-300">
                    {player.name}
                      </span>

                    </div>

                  </div>
                ),
              )}

            </div>

          ) : (

            <div
              className={[
                'flex min-h-[188px]',
                'flex-col',
                'items-center',
                'justify-center',
              ].join(' ')}
            >

              <div
                className={[
                  'mb-3 flex h-10 w-10',
                  'items-center justify-center',
                  'rounded-full',
                  'bg-white/[0.035]',
                  'text-gray-600',
                ].join(' ')}
              >
                <Users size={18} />
              </div>

              <span className="text-sm text-gray-600">
                No players online.
              </span>

            </div>

          )}

        </Panel>

      </div>


      {/* Server controls */}
      <Panel
        title="Server Controls"
        icon={<Activity size={17} />}
      >

        {activeExclusive && (
          <div
            role="status"
            aria-live="polite"
            className={[
              'mb-3 rounded-lg',
              'border border-amber-500/20',
              'bg-amber-500/[0.06]',
              'px-3 py-2',
              'text-xs text-amber-300',
            ].join(' ')}
          >
            <span className="font-mono">{activeExclusive.kind}</span> is already
            running ({activeExclusive.progress}%), so restart-class actions are
            disabled until it finishes.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

          <ControlButton
            icon={<Save size={17} />}
            label="Save World"
            loading={action === 'save'}
            disabled={action !== null}
            onClick={handleSave}
          />

          <ControlButton
            icon={<Sun size={17} />}
            label="Dawn"
            loading={action === 'dawn'}
            disabled={action !== null}
            onClick={() =>
              handleTime('dawn')
            }
          />

          <ControlButton
            icon={<Sun size={17} />}
            label="Noon"
            loading={action === 'noon'}
            disabled={action !== null}
            onClick={() =>
              handleTime('noon')
            }
          />

          <ControlButton
            icon={<Moon size={17} />}
            label="Dusk"
            loading={action === 'dusk'}
            disabled={action !== null}
            onClick={() =>
              handleTime('dusk')
            }
          />

          <ControlButton
            icon={<Moon size={17} />}
            label="Midnight"
            loading={
              action === 'midnight'
            }
            disabled={action !== null}
            onClick={() =>
              handleTime('midnight')
            }
          />

          <ControlButton
            icon={<Power size={17} />}
            label="Restart"
            loading={action === 'restart'}
            disabled={
              action !== null ||
              // Gate on the API, not on the game server: a stopped
              // server is exactly when you want to bring it back up.
              connectivity === 'unreachable' ||
              connectivity === 'connecting' ||
              // A running exclusive operation would answer 409; disable
              // the button instead of letting the click fail.
              activeExclusive !== null
            }
            onClick={() => {
              setMessage('')
              setConfirmRestart(true)
            }}
          />

        </div>

      </Panel>


      {/* Refresh information */}
      <div
        className={[
          'flex items-center gap-2',
          'text-xs text-gray-700',
        ].join(' ')}
      >
        <Database size={13} />

        Server status refreshes every 5 seconds
      </div>


      <ConfirmDialog
        open={confirmRestart}
        onOpenChange={(open) => {
          if (!open && action === null) {
            setConfirmRestart(false)
          }
        }}
        title="Restart server"
        description="Restart the Terraria server process now? Connected players will be disconnected and the world is saved first."
        confirmText="Restart"
        onConfirm={handleRestart}
        loading={action === 'restart'}
        status={message || undefined}
      />

    </div>
  )
}


/* ------------------------------ */
/* Stat Card                       */
/* ------------------------------ */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: 'green' | 'red' | 'amber'
}) {
  const accentTile = accent === 'green'
    ? 'bg-emerald-500/10 text-emerald-400'
    : accent === 'red'
      ? 'bg-red-500/10 text-red-400'
      : accent === 'amber'
        ? 'bg-amber-500/10 text-amber-400'
        : 'bg-white/[0.04] text-gray-500'

  const accentValue = accent === 'green'
    ? 'text-emerald-400'
    : accent === 'red'
      ? 'text-red-400'
      : accent === 'amber'
        ? 'text-amber-400'
        : 'text-gray-100'

  return (
    <div
      className={[
        'rounded-xl',
        'border border-white/[0.07]',
        'bg-[#17191c]',
        'p-5',
        'transition',
        'hover:border-white/[0.10]',
      ].join(' ')}
    >

      <div className="flex items-center justify-between">

        <div
          className={[
            'flex h-9 w-9',
            'items-center justify-center',
            'rounded-lg',
            accentTile,
          ].join(' ')}
        >
          {icon}
        </div>

      </div>


      <div className="mt-5">

        <div
          className={[
            'text-xs font-medium',
            'uppercase tracking-wide',
            'text-gray-600',
          ].join(' ')}
        >
          {label}
        </div>

        <div
          className={[
            'mt-1.5',
            'text-xl font-semibold',
            accentValue,
          ].join(' ')}
        >
          {value}
        </div>

      </div>

    </div>
  )
}


/* ------------------------------ */
/* Panel                           */
/* ------------------------------ */

function Panel({
  title,
  icon,
  trailing,
  children,
}: {
  title: string
  icon: React.ReactNode
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className={[
        'rounded-xl',
        'border border-white/[0.07]',
        'bg-[#17191c]',
        'p-5',
      ].join(' ')}
    >

      <div
        className={[
          'mb-5',
          'flex items-center',
          'justify-between',
        ].join(' ')}
      >

        <div className="flex items-center gap-2.5">

          <div className="text-gray-500">
            {icon}
          </div>

          <h3
            className={[
              'text-sm font-medium',
              'text-gray-200',
            ].join(' ')}
          >
            {title}
          </h3>

        </div>


        {trailing}

      </div>

      {children}

    </section>
  )
}


/* ------------------------------ */
/* Info Row                        */
/* ------------------------------ */

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      className={[
        'flex items-center',
        'justify-between',
        'border-b border-white/[0.05]',
        'py-3 last:border-0',
      ].join(' ')}
    >

      <span className="text-sm text-gray-600">
        {label}
      </span>

      <span
        className={[
          'max-w-[65%]',
          'truncate',
          'text-right',
          'font-mono text-xs',
          'text-gray-400',
        ].join(' ')}
        title={value}
      >
        {value}
      </span>

    </div>
  )
}


/* ------------------------------ */
/* Control Button                  */
/* ------------------------------ */

function ControlButton({
  icon,
  label,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center',
        'justify-center gap-2',
        'rounded-lg',
        'border border-white/[0.07]',
        'bg-white/[0.025]',
        'px-4 py-3',
        'text-sm text-gray-400',
        'transition-all duration-150',
        'hover:border-emerald-500/15',
        'hover:bg-emerald-500/[0.05]',
        'hover:text-gray-200',
        'disabled:cursor-not-allowed',
        'disabled:opacity-40',
      ].join(' ')}
    >

      {loading ? (
        <span
          className={[
            'h-4 w-4',
            'animate-spin',
            'rounded-full',
            'border-2 border-gray-700',
            'border-t-gray-300',
          ].join(' ')}
        />
      ) : (
        icon
      )}

      {loading
        ? 'Working...'
        : label}

    </button>
  )
}


/* ------------------------------ */
/* Helpers                         */
/* ------------------------------ */

function formatTimeName(
  time: ServerTime,
) {
  switch (time) {
    case 'dawn':
      return 'dawn'

    case 'noon':
      return 'noon'

    case 'dusk':
      return 'dusk'

    case 'midnight':
      return 'midnight'
  }
}


/* ------------------------------ */
/* Connectivity tones              */
/* ------------------------------ */

type ConnectivityTone = Connectivity

const CONNECTIVITY_TONES: Record<
  ConnectivityTone,
  {
    border: string
    bg: string
    dot: string
    text: string
  }
> = {
  online: {
    border: 'border-emerald-500/15',
    bg: 'bg-emerald-500/[0.05]',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
  },
  offline: {
    border: 'border-amber-500/15',
    bg: 'bg-amber-500/[0.05]',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
  },
  unreachable: {
    border: 'border-red-500/15',
    bg: 'bg-red-500/[0.05]',
    dot: 'bg-red-400',
    text: 'text-red-400',
  },
  connecting: {
    border: 'border-white/[0.07]',
    bg: 'bg-white/[0.03]',
    dot: 'bg-gray-500',
    text: 'text-gray-400',
  },
}
