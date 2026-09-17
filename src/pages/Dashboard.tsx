import {
  useEffect,
  useState,
} from 'react'

import {
  Activity,
  Clock,
  Database,
  Moon,
  Save,
  Server,
  Sun,
  Users,
} from 'lucide-react'

import {
  getServerStatus,
  saveServer,
  setTime,
  type ServerStatus,
  type ServerTime,
} from '../api/server'


export default function Dashboard() {
  const [status, setStatus] =
    useState<ServerStatus | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [action, setAction] =
    useState<string | null>(null)

  const [message, setMessage] =
    useState('')


  async function refresh() {
    try {
      const data =
        await getServerStatus()

      setStatus(data)
    } catch (error) {
      console.error(
        'Failed to load server status:',
        error,
      )
    } finally {
      setLoading(false)
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

      setMessage(
        'Failed to save world.',
      )
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

      setMessage(
        'Failed to change time.',
      )
    } finally {
      setAction(null)
    }
  }


  useEffect(() => {
    refresh()

    const timer = setInterval(
      refresh,
      5000,
    )

    return () => {
      clearInterval(timer)
    }
  }, [])


  const online =
    status?.players.online ?? 0

  const maxPlayers =
    status?.max_players ?? 0


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
              status?.running
                ? 'border-emerald-500/15'
                : 'border-red-500/15',
              status?.running
                ? 'bg-emerald-500/[0.05]'
                : 'bg-red-500/[0.05]',
              'px-3.5 py-2',
            ].join(' ')}
          >

            <span
              className={[
                'h-2 w-2',
                'rounded-full',
                status?.running
                  ? 'bg-emerald-400'
                  : 'bg-red-400',
              ].join(' ')}
            />

            <span
              className={[
                'text-sm font-medium',
                status?.running
                  ? 'text-emerald-400'
                  : 'text-red-400',
              ].join(' ')}
            >
              {loading
                ? 'Connecting...'
                : status?.running
                  ? 'Server Online'
                  : 'Server Offline'}
            </span>

          </div>

        </div>

      </section>


      {/* Status message */}
      {message && (
        <div
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
            loading
              ? '—'
              : status?.running
                ? 'Online'
                : 'Offline'
          }
          accent={
            status?.running
              ? 'green'
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
              ? `${online} / ${maxPlayers}`
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
              {online} / {maxPlayers}
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

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
  accent?: 'green' | 'red'
}) {
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
            accent === 'green'
              ? 'bg-emerald-500/10 text-emerald-400'
              : accent === 'red'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-white/[0.04] text-gray-500',
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
            accent === 'green'
              ? 'text-emerald-400'
              : accent === 'red'
                ? 'text-red-400'
                : 'text-gray-100',
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
