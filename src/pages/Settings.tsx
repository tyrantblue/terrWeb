import {
  useEffect,
  useState,
} from 'react'

import {
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Save,
  Server,
  Users,
} from 'lucide-react'

import {
  getServerStatus,
  type ServerStatus,
} from '../api/server'
import { ApiError } from '../api/client'
import { formatErrorReport } from '../api/errors'
import ConfirmDialog from '../components/ConfirmDialog'

import {
  getConfig,
  updateMaxPlayers,
  updateMotd,
  updatePassword,
} from '../api/settings'


export default function Settings() {
  const [status, setStatus] =
    useState<ServerStatus | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState<string | null>(null)

  const [message, setMessage] =
    useState('')

  const [maxPlayers, setMaxPlayers] =
    useState('')

  const [motd, setMotd] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [pendingLowMaxPlayers, setPendingLowMaxPlayers] =
    useState<number | null>(null)

  const [recommendedMin, setRecommendedMin] =
    useState<number | null>(null)

  const [lowLimitReason, setLowLimitReason] =
    useState('')


  async function loadSettings(
    clearMessage = true,
  ) {
    try {
      setLoading(true)
      if (clearMessage) {
        setMessage('')
      }

      const [data, config] =
        await Promise.all([
          getServerStatus(),
          getConfig(),
        ])

      setStatus(data)

      setMaxPlayers(
        config.values.maxplayers ??
          String(data.max_players ?? ''),
      )

      setMotd(
        config.values.motd ?? data.motd ?? '',
      )

    } catch (error) {
      console.error(
        'Failed to load settings:',
        error,
      )

      setMessage(
        'Failed to load server settings.',
      )
    } finally {
      setLoading(false)
    }
  }


  async function handleMaxPlayers() {
    const value =
      Number(maxPlayers)

    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 255
    ) {
      setMessage(
        'Max Players must be an integer between 1 and 255.',
      )

      return
    }

    try {
      setSaving('maxplayers')
      setMessage(
        'Updating max players...',
      )

      await updateMaxPlayers(value)

      setMessage(
        `Max players updated to ${value}.`,
      )

      await loadSettings(false)

    } catch (error) {
      console.error(error)

      // The threshold belongs to the backend: it ships the reason and the
      // recommended minimum in `error.details`, so a change there must not
      // require a frontend release.
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.details?.reason === 'phantom-full'
      ) {
        const recommended = Number(
          error.details.recommended_min,
        )

        setPendingLowMaxPlayers(value)
        setRecommendedMin(
          Number.isFinite(recommended) ? recommended : null,
        )
        setLowLimitReason(
          error.message ||
            'Unsolicted connections consume player slots.',
        )
        // Leave `message` empty so the dialog shows the backend's reason;
        // the dialog title already explains that confirmation is needed.
        setMessage('')
        return
      }

      setMessage(formatErrorReport(error))
    } finally {
      setSaving(null)
    }
  }


  async function confirmLowMaxPlayers() {
    if (pendingLowMaxPlayers === null) {
      return
    }

    const value = pendingLowMaxPlayers

    try {
      setSaving('maxplayers')
      await updateMaxPlayers(value, true)
      setPendingLowMaxPlayers(null)
      setMessage(
        `Max players updated to ${value}.`,
      )
      await loadSettings(false)
    } catch (error) {
      console.error(error)
      setMessage(formatErrorReport(error))
    } finally {
      setSaving(null)
    }
  }


  async function handleMotd() {
    const value =
      motd.trim()

    if (!value) {
      setMessage(
        'MOTD cannot be empty.',
      )

      return
    }

    try {
      setSaving('motd')
      setMessage(
        'Updating MOTD...',
      )

      await updateMotd(value)

      setMessage(
        'MOTD updated successfully.',
      )

      await loadSettings(false)

    } catch (error) {
      console.error(error)

      setMessage(formatErrorReport(error))
    } finally {
      setSaving(null)
    }
  }


  async function handlePassword() {
    if (
      password.includes('\n') ||
      password.includes('\r')
    ) {
      setMessage(
        'Password must be a single line.',
      )

      return
    }

    try {
      setSaving('password')
      setMessage(
        'Updating password...',
      )

      await updatePassword(password)

      setPassword('')

      setMessage(
        password
          ? 'Server password updated.'
          : 'Server password cleared.',
      )

    } catch (error) {
      console.error(error)

      setMessage(formatErrorReport(error))
    } finally {
      setSaving(null)
    }
  }


  useEffect(() => {
    const initialLoad = window.setTimeout(
      loadSettings,
      0,
    )

    return () => {
      window.clearTimeout(initialLoad)
    }
  }, [])


  return (
    <div className="space-y-6">

      {/* 页面标题 */}
      <div className="flex items-center justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div
              className={[
                'ui-icon-tile',
                'h-10 w-10',
              ].join(' ')}
            >
              <Server size={20} />
            </div>

            <div>

              <h2 className="ui-page-title">
                Settings
              </h2>

              <p className="ui-page-description">
                Configure your Terraria server
              </p>

            </div>

          </div>
        </div>


        <button
          onClick={() => void loadSettings()}
          disabled={
            loading ||
            saving !== null
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


      {/* 状态消息 */}
      {message && (
        <div
          className={[
            'ui-panel-subtle',
            'px-4 py-3',
            'text-sm text-gray-400',
          ].join(' ')}
        >
          {message}
        </div>
      )}


      {/* Server information */}
      <section
        className={[
          'ui-panel',
          'p-5',
        ].join(' ')}
      >

        <div className="mb-5 flex items-center gap-2">

          <Server
            size={18}
            className="text-gray-400"
          />

          <h3 className="font-medium text-gray-200">
            Server Information
          </h3>

        </div>


        <div className="grid gap-4 md:grid-cols-2">

          <ReadonlyField
            label="Version"
            value={
              loading
                ? 'Loading...'
                : status?.version ?? '—'
            }
          />

          <ReadonlyField
            label="Port"
            value={
              loading
                ? 'Loading...'
                : status
                  ? String(status.port)
                  : '—'
            }
          />

        </div>

      </section>


      {/* Player settings */}
      <section
        className={[
          'rounded-xl border',
          'border-white/10',
          'bg-[#17191c]',
          'p-5',
        ].join(' ')}
      >

        <div className="mb-5 flex items-center gap-2">

          <Users
            size={18}
            className="text-gray-400"
          />

          <h3 className="font-medium text-gray-200">
            Player Settings
          </h3>

        </div>


        <SettingRow
          label="Max Players"
          description="Maximum number of players allowed on the server."
        >

          <div className="flex gap-2">

            <input
              type="number"
              min={1}
              max={255}
              value={maxPlayers}
              onChange={(event) =>
                setMaxPlayers(
                  event.target.value,
                )
              }
              disabled={
                loading ||
                saving !== null
              }
              className={[
                'w-28 rounded-lg',
                'border border-white/10',
                'bg-white/5',
                'px-3 py-2',
                'text-sm text-gray-200',
                'outline-none',
                'transition',
                'focus:border-emerald-500/40',
                'disabled:opacity-50',
              ].join(' ')}
            />

            <SaveButton
              loading={
                saving === 'maxplayers'
              }
              disabled={
                loading ||
                saving !== null
              }
              onClick={
                handleMaxPlayers
              }
            />

          </div>

        </SettingRow>

      </section>


      {/* Message settings */}
      <section
        className={[
          'rounded-xl border',
          'border-white/10',
          'bg-[#17191c]',
          'p-5',
        ].join(' ')}
      >

        <div className="mb-5 flex items-center gap-2">

          <MessageIcon />

          <h3 className="font-medium text-gray-200">
            Message Settings
          </h3>

        </div>


        <SettingRow
          label="MOTD"
          description="Message displayed to players when they join."
        >

          <div className="flex min-w-0 gap-2">

            <input
              type="text"
              value={motd}
              onChange={(event) =>
                setMotd(
                  event.target.value,
                )
              }
              disabled={
                loading ||
                saving !== null
              }
              className={[
                'min-w-0 flex-1',
                'rounded-lg',
                'border border-white/10',
                'bg-white/5',
                'px-3 py-2',
                'text-sm text-gray-200',
                'outline-none',
                'transition',
                'focus:border-emerald-500/40',
                'disabled:opacity-50',
              ].join(' ')}
            />

            <SaveButton
              loading={
                saving === 'motd'
              }
              disabled={
                loading ||
                saving !== null
              }
              onClick={handleMotd}
            />

          </div>

        </SettingRow>

      </section>


      {/* Security settings */}
      <section
        className={[
          'rounded-xl border',
          'border-white/10',
          'bg-[#17191c]',
          'p-5',
        ].join(' ')}
      >

        <div className="mb-5 flex items-center gap-2">

          <Lock
            size={18}
            className="text-gray-400"
          />

          <h3 className="font-medium text-gray-200">
            Security
          </h3>

        </div>


        <SettingRow
          label="Server Password"
          description="Leave empty to remove the current password."
        >

          <div className="flex min-w-0 gap-2">

            <div className="relative min-w-0 flex-1">

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                disabled={
                  loading ||
                  saving !== null
                }
                placeholder="Enter new password"
                className={[
                  'w-full rounded-lg',
                  'border border-white/10',
                  'bg-white/5',
                  'px-3 py-2',
                  'pr-10',
                  'text-sm text-gray-200',
                  'outline-none',
                  'transition',
                  'placeholder:text-gray-600',
                  'focus:border-emerald-500/40',
                  'disabled:opacity-50',
                ].join(' ')}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) => !value,
                  )
                }
                className={[
                  'absolute right-2',
                  'top-1/2',
                  '-translate-y-1/2',
                  'rounded-md p-1.5',
                  'text-gray-500',
                  'transition',
                  'hover:bg-white/5',
                  'hover:text-gray-300',
                ].join(' ')}
              >
                {showPassword ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}
              </button>

            </div>


            <SaveButton
              loading={
                saving === 'password'
              }
              disabled={
                loading ||
                saving !== null
              }
              onClick={handlePassword}
            />

          </div>

        </SettingRow>

      </section>


      <div
        className={[
          'text-xs text-gray-600',
        ].join(' ')}
      >
        Changes are applied directly to the running
        Terraria server.
      </div>

      <ConfirmDialog
        open={pendingLowMaxPlayers !== null}
        onOpenChange={(open) => {
          if (!open && saving === null) {
            setPendingLowMaxPlayers(null)
          }
        }}
        title="Use a low player limit?"
        description={
          `The game counts every unsolicited connection against the player limit, so a low cap can look full when nobody is playing.${
            recommendedMin !== null
              ? ` The server recommends at least ${recommendedMin}.`
              : ''
          } Continue with ${pendingLowMaxPlayers ?? ''} players?`
        }
        confirmText="Use this limit"
        onConfirm={confirmLowMaxPlayers}
        loading={saving === 'maxplayers'}
        status={message || lowLimitReason || undefined}
      />

    </div>
  )
}


function ReadonlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>

      <div className="mb-2 text-xs text-gray-500">
        {label}
      </div>

      <div
        className={[
          'rounded-lg',
          'border border-white/5',
          'bg-white/[0.03]',
          'px-3 py-2',
          'text-sm text-gray-400',
        ].join(' ')}
      >
        {value}
      </div>

    </div>
  )
}


function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div
      className={[
        'flex flex-col gap-4',
        'border-b border-white/5',
        'py-4 first:pt-0 last:border-0 last:pb-0',
        'lg:flex-row',
        'lg:items-center',
        'lg:justify-between',
      ].join(' ')}
    >

      <div className="min-w-0">

        <div className="text-sm text-gray-200">
          {label}
        </div>

        <div className="mt-1 text-xs text-gray-600">
          {description}
        </div>

      </div>


      <div className="min-w-0 lg:w-[55%]">
        {children}
      </div>

    </div>
  )
}


function SaveButton({
  loading,
  disabled,
  onClick,
}: {
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
        'bg-emerald-500/10',
        'px-4 py-2',
        'text-sm font-medium',
        'text-emerald-400',
        'transition',
        'hover:bg-emerald-500/20',
        'disabled:cursor-not-allowed',
        'disabled:opacity-40',
      ].join(' ')}
    >

      {loading ? (
        <span
          className={[
            'h-4 w-4',
            'animate-spin rounded-full',
            'border-2 border-emerald-900',
            'border-t-emerald-300',
          ].join(' ')}
        />
      ) : (
        <Save size={15} />
      )}

      {loading
        ? 'Saving...'
        : 'Save'}

    </button>
  )
}


function MessageIcon() {
  return (
    <div
      className={[
        'flex h-[18px] w-[18px]',
        'items-center justify-center',
        'text-gray-400',
      ].join(' ')}
    >
      <span className="text-sm">
        Aa
      </span>
    </div>
  )
}
