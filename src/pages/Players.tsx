
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  Ban,
  MessageSquare,
  RefreshCw,
  Undo2,
  UserMinus,
  Users,
} from 'lucide-react'

import {
  banPlayer,
  getBans,
  getPlayers,
  kickPlayer,
  sendSay,
  unbanPlayer,
  type BanListResponse,
  type PlayersResponse,
} from '../api/server'
import { formatErrorReport } from '../api/errors'

import ConfirmDialog from '../components/ConfirmDialog'


type ConfirmAction = {
  type: 'kick' | 'ban' | 'unban'
  player: string
}


export default function Players() {
  const [status, setStatus] =
    useState<PlayersResponse | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [action, setAction] =
    useState<string | null>(null)

  const [message, setMessage] =
    useState('')

  const [sayMessage, setSayMessage] =
    useState('')

  const [bans, setBans] =
    useState<BanListResponse | null>(null)

  const [bansLoading, setBansLoading] =
    useState(true)

  const [bansError, setBansError] =
    useState('')

  const [playersError, setPlayersError] =
    useState('')

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null)


  async function loadPlayers() {
    try {
      setLoading(true)

      const data =
        await getPlayers()

      setStatus(data)
      setPlayersError('')

    } catch (error) {
      console.error(
        'Failed to load players:',
        error,
      )

      setPlayersError(
        'Failed to load players.',
      )

    } finally {
      setLoading(false)
    }
  }


  async function loadBans() {
    try {
      setBans(await getBans())
      setBansError('')
    } catch (error) {
      console.error(
        'Failed to load the ban list:',
        error,
      )

      setBansError('Failed to load the ban list.')
    } finally {
      setBansLoading(false)
    }
  }


  function handleUnbanRequest(
    player: string,
  ) {
    if (action !== null) {
      return
    }

    setMessage('')

    setConfirmAction({
      type: 'unban',
      player,
    })
  }


  function handleKickRequest(
    player: string,
  ) {
    if (action !== null) {
      return
    }

    setMessage('')

    setConfirmAction({
      type: 'kick',
      player,
    })
  }


  function handleBanRequest(
    player: string,
  ) {
    if (action !== null) {
      return
    }

    setMessage('')

    setConfirmAction({
      type: 'ban',
      player,
    })
  }


  async function handleConfirmAction() {
    if (!confirmAction) {
      return
    }

    const {
      type,
      player,
    } = confirmAction

    try {
      setAction(
        `${type}:${player}`,
      )

      setMessage(
        type === 'kick'
          ? `Kicking ${player}...`
          : type === 'ban'
            ? `Banning ${player}...`
            : `Unbanning ${player}...`,
      )

      if (type === 'kick') {
        await kickPlayer(player)

        setMessage(
          `${player} has been kicked.`,
        )
      } else if (type === 'ban') {
        await banPlayer(player)

        setMessage(
          `${player} has been banned.`,
        )
      } else {
        await unbanPlayer(player)

        setMessage(
          `${player} has been unbanned.`,
        )
      }

      setConfirmAction(null)

      await Promise.all([
        loadPlayers(),
        loadBans(),
      ])

    } catch (error) {
      console.error(error)

      const detail =
        error instanceof Error
          ? error.message
          : 'Unknown error'

      setMessage(
        `${type === 'kick'
          ? 'Kick'
          : type === 'ban'
            ? 'Ban'
            : 'Unban'} of ${player} failed: ${detail}`,
      )

    } finally {
      setAction(null)
    }
  }


  function handleDialogChange(
    open: boolean,
  ) {
    if (
      !open &&
      action === null
    ) {
      setConfirmAction(null)
    }
  }


  async function handleSay(
    event: FormEvent,
  ) {
    event.preventDefault()

    const value =
      sayMessage.trim()

    if (
      !value ||
      action !== null
    ) {
      return
    }

    try {
      setAction('say')

      setMessage(
        'Sending message...',
      )

      await sendSay(value)

      setSayMessage('')

      setMessage(
        'Message sent.',
      )

    } catch (error) {
      console.error(error)

      setMessage(formatErrorReport(error))

    } finally {
      setAction(null)
    }
  }


  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => {
        void loadPlayers()
        void loadBans()
      },
      0,
    )

    const timer = setInterval(
      () => {
        void loadPlayers()
        void loadBans()
      },
      5000,
    )

    return () => {
      window.clearTimeout(initialLoad)
      clearInterval(timer)
    }
  }, [])


  const confirmCopy = confirmAction === null
    ? null
    : confirmAction.type === 'ban'
      ? {
          title: 'Ban Player',
          description: `Ban "${confirmAction.player}" from the server? They will no longer be able to join.`,
          confirmText: 'Ban Player',
        }
      : confirmAction.type === 'unban'
        ? {
            title: 'Unban Player',
            description: `Remove "${confirmAction.player}" from banlist.txt? They will be able to join again.`,
            confirmText: 'Unban',
          }
        : {
            title: 'Kick Player',
            description: `Kick "${confirmAction.player}" from the server? They can join again later.`,
            confirmText: 'Kick Player',
          }


  return (
    <div className="space-y-6">

      {/* Header */}
      <div
        className={[
          'flex flex-col gap-4',
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
                'h-10 w-10',
              ].join(' ')}
            >
              <Users size={20} />
            </div>


            <div>

              <h2
                  className={[
                  'ui-page-title',
                ].join(' ')}
              >
                Players
              </h2>

              <p className="ui-page-description">
                Manage connected players
              </p>

            </div>

          </div>

        </div>


        <button
          onClick={loadPlayers}
          disabled={
            loading ||
            action !== null
          }
          className={[
            'ui-button',
            'ui-button-secondary',
          ].join(' ')}
        >

          <RefreshCw
            size={16}
            className={
              loading
                ? 'animate-spin'
                : ''
            }
          />

          Refresh

        </button>

      </div>


      {/* Status message */}
      {playersError && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'rounded-lg',
            'border border-red-500/10',
            'bg-red-500/[0.04]',
            'px-4 py-3',
            'text-sm text-red-400',
          ].join(' ')}
        >
          {playersError}
        </div>
      )}

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'ui-panel-subtle',
            'px-4 py-3',
            'text-sm text-gray-500',
          ].join(' ')}
        >
          {message}
        </div>
      )}


      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">

        <StatCard
          label="Online Players"
          value={
            status
              ? String(
                  status.online,
                )
              : '—'
          }
          icon={<Users size={17} />}
        />

        <StatCard
          label="Player Limit"
          value={
            status?.max != null
              ? String(status.max)
              : '—'
          }
          icon={<Users size={17} />}
        />

        <StatCard
          label="Server Status"
          value={
            status !== null
              ? 'Online'
              : 'Offline'
          }
          icon={
            <span
              className={[
                'h-2 w-2',
                'rounded-full',
                status !== null
                  ? 'bg-emerald-400'
                  : 'bg-red-400',
              ].join(' ')}
            />
          }
          online={status !== null}
        />

      </div>


      {/* Online players */}
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

            <div
              className={[
                'flex h-8 w-8',
                'items-center justify-center',
                'rounded-lg',
                'bg-emerald-500/10',
                'text-emerald-400',
              ].join(' ')}
            >
              <Users size={16} />
            </div>


            <div>

              <h3 className="font-medium text-gray-200">
                Online Players
              </h3>

              <p className="mt-0.5 text-xs text-gray-600">
                Currently connected to the server
              </p>

            </div>

          </div>


          <div
            className={[
              'rounded-md',
              'bg-white/[0.03]',
              'px-2.5 py-1',
              'text-xs text-gray-500',
            ].join(' ')}
          >
            {status
              ? `${status.online} / ${status.max ?? '—'}`
              : '—'}
          </div>

        </div>


        {loading && status === null ? (

          <div
            className={[
              'flex min-h-[180px]',
              'items-center justify-center',
              'rounded-lg',
              'bg-white/[0.015]',
              'text-sm text-gray-600',
            ].join(' ')}
          >
            Loading players...
          </div>

        ) : status?.players.length ? (

          <div className="ui-scroll-region space-y-2 pr-1">

            {status.players.map(
              (player) => {
                const playerName = player.name
                const kicking =
                  action ===
                  `kick:${playerName}`

                const banning =
                  action ===
                  `ban:${playerName}`

                return (
                  <div
                    key={`${playerName}-${player.ip}-${player.port}`}
                    className={[
                      'flex flex-col',
                      'gap-3',
                      'rounded-lg',
                      'border border-white/[0.05]',
                      'bg-white/[0.02]',
                      'px-4 py-3',
                      'transition',
                      'sm:flex-row',
                      'sm:items-center',
                      'sm:justify-between',
                      'hover:border-white/[0.08]',
                      'hover:bg-white/[0.025]',
                    ].join(' ')}
                  >

                    {/* Player */}
                    <div className="flex items-center gap-3">

                      <div
                        className={[
                          'flex h-9 w-9',
                          'items-center justify-center',
                          'rounded-lg',
                          'bg-emerald-500/10',
                          'text-xs font-semibold',
                          'text-emerald-400',
                        ].join(' ')}
                      >
                        {getInitial(playerName)}
                      </div>


                      <div>

                        <div className="flex items-center gap-2">

                          <span
                            className={[
                              'text-sm font-medium',
                              'text-gray-200',
                            ].join(' ')}
                          >
                            {playerName}
                          </span>


                          <span
                            className={[
                              'flex items-center gap-1',
                              'text-[11px]',
                              'text-emerald-500',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'h-1.5 w-1.5',
                                'rounded-full',
                                'bg-emerald-400',
                              ].join(' ')}
                            />

                            Online
                          </span>

                        </div>

                        <div className="mt-0.5 font-mono text-[11px] text-gray-600">
                          {player.ip}:{player.port}
                        </div>

                      </div>

                    </div>


                    {/* Actions */}
                    <div className="flex items-center gap-1.5">

                      <button
                        onClick={() =>
                          handleKickRequest(playerName)
                        }
                        disabled={
                          action !== null
                        }
                        className={[
                          'flex items-center',
                          'gap-1.5',
                          'rounded-md',
                          'border border-amber-500/10',
                          'bg-amber-500/[0.04]',
                          'px-3 py-1.5',
                          'text-xs font-medium',
                          'text-amber-400',
                          'transition',
                          'hover:border-amber-500/20',
                          'hover:bg-amber-500/10',
                          'disabled:cursor-not-allowed',
                          'disabled:opacity-40',
                        ].join(' ')}
                      >

                        <UserMinus size={14} />

                        {kicking
                          ? 'Kicking...'
                          : 'Kick'}

                      </button>


                      <button
                        onClick={() =>
                          handleBanRequest(playerName)
                        }
                        disabled={
                          action !== null
                        }
                        className={[
                          'flex items-center',
                          'gap-1.5',
                          'rounded-md',
                          'border border-red-500/10',
                          'bg-red-500/[0.04]',
                          'px-3 py-1.5',
                          'text-xs font-medium',
                          'text-red-400',
                          'transition',
                          'hover:border-red-500/20',
                          'hover:bg-red-500/10',
                          'disabled:cursor-not-allowed',
                          'disabled:opacity-40',
                        ].join(' ')}
                      >

                        <Ban size={14} />

                        {banning
                          ? 'Banning...'
                          : 'Ban'}

                      </button>

                    </div>

                  </div>
                )
              },
            )}

          </div>

        ) : (

          <div
            className={[
              'flex min-h-[180px]',
              'flex-col',
              'items-center',
              'justify-center',
              'rounded-lg',
              'border border-white/[0.04]',
              'bg-white/[0.015]',
              'text-center',
            ].join(' ')}
          >

            <div
              className={[
                'mb-3 flex h-10 w-10',
                'items-center justify-center',
                'rounded-lg',
                'bg-white/[0.03]',
                'text-gray-600',
              ].join(' ')}
            >
              <Users size={18} />
            </div>

            <div className="text-sm text-gray-500">
              No players online.
            </div>

            <div className="mt-1 text-xs text-gray-700">
              Players will appear here when they connect.
            </div>

          </div>

        )}

      </section>


      {/* Banned players */}
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

            <div
              className={[
                'flex h-8 w-8',
                'items-center justify-center',
                'rounded-lg',
                'bg-red-500/10',
                'text-red-400',
              ].join(' ')}
            >
              <Ban size={16} />
            </div>


            <div>

              <h3 className="font-medium text-gray-200">
                Banned Players
              </h3>

              <p className="mt-0.5 text-xs text-gray-600">
                Names listed in banlist.txt
              </p>

            </div>

          </div>


          <div
            className={[
              'rounded-md',
              'bg-white/[0.03]',
              'px-2.5 py-1',
              'text-xs text-gray-500',
            ].join(' ')}
          >
            {bans ? bans.bans.length : '—'}
          </div>

        </div>


        {bansError ? (

          <div
            className={[
              'rounded-lg',
              'border border-red-500/10',
              'bg-red-500/[0.04]',
              'px-4 py-3',
              'text-sm text-red-400',
            ].join(' ')}
          >
            {bansError}
          </div>

        ) : bansLoading && bans === null ? (

          <div
            className={[
              'flex min-h-[120px]',
              'items-center',
              'justify-center',
              'rounded-lg',
              'border border-white/[0.04]',
              'bg-white/[0.015]',
              'text-sm text-gray-600',
            ].join(' ')}
          >
            Loading ban list...
          </div>

        ) : bans && bans.bans.length > 0 ? (

          <div className="ui-scroll-region space-y-2 pr-1">

            {bans.bans.map((name, index) => {

              const unbanning =
                action === `unban:${name}`

              return (
                <div
                  // banlist.txt is a flat file, so a name can repeat.
                  key={`${name}-${index}`}
                  className={[
                    'flex flex-col',
                    'gap-3',
                    'rounded-lg',
                    'border border-white/[0.05]',
                    'bg-white/[0.02]',
                    'px-4 py-3',
                    'transition',
                    'sm:flex-row',
                    'sm:items-center',
                    'sm:justify-between',
                    'hover:border-white/[0.08]',
                  ].join(' ')}
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className={[
                        'flex h-9 w-9',
                        'items-center justify-center',
                        'rounded-lg',
                        'bg-red-500/10',
                        'text-red-400',
                      ].join(' ')}
                    >
                      <Ban size={15} />
                    </div>


                    <div className="min-w-0">

                      <div className="truncate font-mono text-sm text-gray-200">
                        {name}
                      </div>

                      <div className="mt-0.5 text-[11px] text-gray-600">
                        Applied through the server console
                      </div>

                    </div>

                  </div>


                  <button
                    onClick={() =>
                      handleUnbanRequest(name)
                    }
                    disabled={action !== null}
                    className={[
                      'flex shrink-0 items-center',
                      'gap-1.5',
                      'rounded-md',
                      'border border-emerald-500/10',
                      'bg-emerald-500/[0.04]',
                      'px-3 py-1.5',
                      'text-xs font-medium',
                      'text-emerald-400',
                      'transition',
                      'hover:border-emerald-500/20',
                      'hover:bg-emerald-500/10',
                      'disabled:cursor-not-allowed',
                      'disabled:opacity-40',
                    ].join(' ')}
                  >

                    <Undo2 size={14} />

                    {unbanning
                      ? 'Unbanning...'
                      : 'Unban'}

                  </button>

                </div>
              )
            })}

          </div>

        ) : (

          <div
            className={[
              'flex min-h-[120px]',
              'flex-col',
              'items-center',
              'justify-center',
              'rounded-lg',
              'border border-white/[0.04]',
              'bg-white/[0.015]',
              'text-center',
            ].join(' ')}
          >

            <div
              className={[
                'mb-3 flex h-10 w-10',
                'items-center justify-center',
                'rounded-lg',
                'bg-white/[0.03]',
                'text-gray-600',
              ].join(' ')}
            >
              <Ban size={18} />
            </div>

            <div className="text-sm text-gray-500">
              No banned players.
            </div>

            <div className="mt-1 max-w-xl text-xs leading-5 text-gray-700">
              {bans && !bans.exists
                ? bans.note ||
                  'banlist.txt does not exist yet — the vanilla console only creates it on the first ban.'
                : 'Bans applied from this panel appear here.'}
            </div>

          </div>

        )}


        <p className="mt-3 text-[11px] leading-5 text-gray-600">
          The vanilla server console only has <span className="font-mono">ban</span>, never{' '}
          <span className="font-mono">unban</span>, so lifting a ban removes the
          name&apos;s line from <span className="font-mono">banlist.txt</span> here.
        </p>

      </section>


      {/* Broadcast message */}
      <section
        className={[
          'rounded-xl',
          'border border-white/[0.07]',
          'bg-[#17191c]',
          'p-5',
        ].join(' ')}
      >

        <div className="mb-5 flex items-center gap-2.5">

          <div
            className={[
              'flex h-8 w-8',
              'items-center justify-center',
              'rounded-lg',
              'bg-emerald-500/10',
              'text-emerald-400',
            ].join(' ')}
          >
            <MessageSquare size={16} />
          </div>


          <div>

            <h3 className="font-medium text-gray-200">
              Broadcast Message
            </h3>

            <p className="mt-0.5 text-xs text-gray-600">
              Send a message to everyone on the server
            </p>

          </div>

        </div>


        <form
          onSubmit={handleSay}
          className={[
            'flex flex-col gap-2',
            'sm:flex-row',
          ].join(' ')}
        >

          <input
            value={sayMessage}
            onChange={(event) =>
              setSayMessage(
                event.target.value,
              )
            }
            disabled={
              action !== null
            }
            placeholder="Message to all players..."
            className={[
              'min-w-0 flex-1',
              'rounded-lg',
              'border border-white/[0.07]',
              'bg-white/[0.025]',
              'px-4 py-2.5',
              'text-sm text-gray-200',
              'outline-none',
              'transition',
              'placeholder:text-gray-600',
              'focus:border-emerald-500/30',
              'focus:bg-white/[0.035]',
              'disabled:cursor-not-allowed',
              'disabled:opacity-40',
            ].join(' ')}
          />


          <button
            type="submit"
            disabled={
              !sayMessage.trim() ||
              action !== null
            }
            className={[
              'rounded-lg',
              'border border-emerald-500/10',
              'bg-emerald-500/[0.06]',
              'px-5 py-2.5',
              'text-sm font-medium',
              'text-emerald-400',
              'transition',
              'hover:border-emerald-500/20',
              'hover:bg-emerald-500/10',
              'disabled:cursor-not-allowed',
              'disabled:opacity-40',
            ].join(' ')}
          >
            {action === 'say'
              ? 'Sending...'
              : 'Send'}
          </button>

        </form>

      </section>


      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={handleDialogChange}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.description ?? ''}
        confirmText={confirmCopy?.confirmText ?? ''}
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        loading={action !== null}
        status={message || undefined}
      />

    </div>
  )
}


/* ------------------------------ */
/* Stat Card                       */
/* ------------------------------ */

function StatCard({
  label,
  value,
  icon,
  online,
}: {
  label: string
  value: string
  icon: React.ReactNode
  online?: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl',
        'border border-white/[0.07]',
        'bg-[#17191c]',
        'p-5',
      ].join(' ')}
    >

      <div className="flex items-center justify-between">

        <div className="text-xs text-gray-600">
          {label}
        </div>


        <div
          className={[
            'text-gray-600',
            online === true
              ? 'text-emerald-400'
              : online === false
                ? 'text-red-400'
                : '',
          ].join(' ')}
        >
          {icon}
        </div>

      </div>


      <div
        className={[
          'mt-3 text-2xl font-semibold',
          online === true
            ? 'text-emerald-400'
            : online === false
              ? 'text-red-400'
              : 'text-gray-100',
        ].join(' ')}
      >
        {value}
      </div>

    </div>
  )
}


/* ------------------------------ */
/* Player initial                  */
/* ------------------------------ */

function getInitial(
  player: string,
) {
  const value =
    player.trim()

  if (!value) {
    return '?'
  }

  return value
    .charAt(0)
    .toUpperCase()
}
