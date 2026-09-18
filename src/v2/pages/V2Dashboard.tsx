import { useState } from 'react'

import { restartServer, saveServer, setTime, type ServerTime } from '../../api/server'
import { runOperation } from '../../api/world'
import { formatErrorReport } from '../../api/errors'
import { useServerStatus } from '../../context/serverStatus'
import { useOperations } from '../../context/operations'
import { useConsoleHeartbeat } from '../../context/consoleHeartbeat'
import { useAbortOnUnmount } from '../../hooks/useAbortOnUnmount'
import {
  TerBadge,
  TerButton,
  TerDialog,
  TerEmpty,
  TerPanel,
  TerRow,
  TerSectionHeading,
  TerStat,
} from '../ui'

/**
 * Dashboard rendered entirely with the v2 chrome.
 *
 * Deliberately reuses the existing providers and API modules — the point of
 * this phase is to prove the skin can change without touching data logic.
 */
export default function V2Dashboard() {
  const { status, connectivity, refresh } = useServerStatus()
  const { operations, activeExclusive } = useOperations()
  const heartbeat = useConsoleHeartbeat()

  const abort = useAbortOnUnmount()

  const [action, setAction] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [confirmRestart, setConfirmRestart] = useState(false)

  const serverOnline = connectivity === 'online'
  const heartbeatFault =
    heartbeat.state === 'stalled' ||
    heartbeat.state === 'error' ||
    status?.log_stalled === true

  async function handleRestart() {
    try {
      setAction('restart')
      setMessage('Restarting the server…')

      await runOperation(restartServer, {
        adoptKind: 'server.restart',
        signal: abort.current?.signal,
        onProgress: (current) => {
          setMessage(current.message ?? `Restarting… ${current.progress}%`)
        },
        onAdopt: () => setMessage('A restart is already running — following it.'),
      })

      setConfirmRestart(false)
      setMessage('Server restarted.')
      await refresh()
    } catch (error) {
      setMessage(formatErrorReport(error))
    } finally {
      setAction(null)
    }
  }

  async function handleSave() {
    try {
      setAction('save')
      setMessage('Saving the world…')
      await saveServer()
      setMessage('World saved.')
      await refresh()
    } catch (error) {
      setMessage(formatErrorReport(error))
    } finally {
      setAction(null)
    }
  }

  async function handleTime(phase: ServerTime) {
    try {
      setAction(phase)
      setMessage(`Setting time to ${phase}…`)
      await setTime(phase)
      setMessage(`Time set to ${phase}.`)
      await refresh()
    } catch (error) {
      setMessage(formatErrorReport(error))
    } finally {
      setAction(null)
    }
  }

  const connectivityTone = serverOnline
    ? 'ok'
    : connectivity === 'offline'
      ? 'warn'
      : connectivity === 'unreachable'
        ? 'danger'
        : 'neutral'

  const connectivityLabel = serverOnline
    ? 'Online'
    : connectivity === 'offline'
      ? 'Stopped'
      : connectivity === 'unreachable'
        ? 'Unreachable'
        : 'Connecting'

  return (
    <div className="space-y-6">
      {heartbeatFault && (
        <div className="ter-panel ter-moss-top p-4">
          <div className="flex items-center gap-2">
            <TerBadge tone="danger" icon="warning">
              Log pipeline stalled
            </TerBadge>
          </div>
          <p className="ter-small mt-2">
            The game may still be running, but the panel cannot read its log, so
            status, players and console output are stale. Recovery: run{' '}
            <span className="ter-mono">save</span>, then{' '}
            <span className="ter-mono">docker compose restart terraria</span>.
          </p>
        </div>
      )}

      <TerSectionHeading
        title="Server overview"
        icon="grid"
        description="Live state pulled from the same providers the classic UI uses."
        actions={
          <TerButton icon="refresh" onClick={() => void refresh()}>
            Refresh
          </TerButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TerStat
          label="Status"
          value={connectivityLabel}
          icon="heart"
          tone={connectivityTone}
        />
        <TerStat
          label="Players"
          value={`${status?.players.online ?? 0} / ${status?.max_players ?? '—'}`}
          icon="players"
        />
        <TerStat
          label="Version"
          value={status?.version ?? '—'}
          icon="server"
        />
        <TerStat
          label="World"
          value={status?.world?.name ?? '—'}
          icon="world"
          hint={status?.world ? `${status.world.file} · ${(status.world.size / 1024 / 1024).toFixed(1)} MB` : undefined}
        />
      </div>

      {message && (
        <div className="ter-panel-inset px-4 py-3">
          <span className="ter-small" role="status" aria-live="polite">
            {message}
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <TerPanel mossTop className="p-5">
          <h3 className="ter-h3 mb-4">Controls</h3>

          {activeExclusive && (
            <div className="ter-panel-inset mb-3 px-3 py-2">
              <span className="ter-small">
                <span className="ter-mono">{activeExclusive.kind}</span> is already
                running ({activeExclusive.progress}%) — restart-class actions are
                disabled until it finishes.
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <TerButton
              icon="save"
              loading={action === 'save'}
              disabled={action !== null}
              onClick={handleSave}
            >
              Save world
            </TerButton>
            {(['dawn', 'noon', 'dusk', 'midnight'] as ServerTime[]).map((phase) => (
              <TerButton
                key={phase}
                icon={phase === 'dawn' || phase === 'noon' ? 'sun' : 'moon'}
                loading={action === phase}
                disabled={action !== null}
                onClick={() => handleTime(phase)}
              >
                {phase}
              </TerButton>
            ))}
            <TerButton
              variant="danger"
              icon="restart"
              loading={action === 'restart'}
              disabled={
                action !== null ||
                connectivity === 'unreachable' ||
                connectivity === 'connecting' ||
                activeExclusive !== null
              }
              onClick={() => {
                setMessage('')
                setConfirmRestart(true)
              }}
            >
              Restart
            </TerButton>
          </div>

          <hr className="ter-divider my-5" />

          <h3 className="ter-h3 mb-3">Connected players</h3>
          {status?.players.players.length ? (
            <div className="space-y-2">
              {status.players.players.map((player) => (
                <TerRow
                  key={`${player.name}-${player.ip}-${player.port}`}
                  icon="players"
                  title={player.name}
                  subtitle={`${player.ip}:${player.port}`}
                  meta={<TerBadge tone="ok">Online</TerBadge>}
                />
              ))}
            </div>
          ) : (
            <TerEmpty
              icon="players"
              title="No players online."
              hint="They will appear here when they connect."
            />
          )}
        </TerPanel>

        <TerPanel mossTop className="p-5">
          <h3 className="ter-h3 mb-4">Recent operations</h3>
          {operations.length ? (
            <div className="space-y-2">
              {operations.slice(0, 6).map((operation) => (
                <TerRow
                  key={operation.id}
                  icon={operation.kind.includes('world') ? 'world' : 'restart'}
                  title={operation.kind}
                  subtitle={
                    operation.state === 'succeeded' || operation.state === 'failed'
                      ? operation.message
                      : operation.message || 'In progress'
                  }
                  meta={
                    <TerBadge
                      tone={
                        operation.state === 'succeeded'
                          ? 'ok'
                          : operation.state === 'failed'
                            ? 'danger'
                            : operation.state === 'running'
                              ? 'info'
                              : 'neutral'
                      }
                    >
                      {operation.state === 'running' || operation.state === 'pending'
                        ? `${operation.progress}%`
                        : operation.state}
                    </TerBadge>
                  }
                />
              ))}
            </div>
          ) : (
            <TerEmpty
              icon="clock"
              title="No operations recorded."
              hint="The API clears this list when it restarts."
            />
          )}
        </TerPanel>
      </div>

      <TerDialog
        open={confirmRestart}
        onOpenChange={setConfirmRestart}
        title="Restart the server?"
        description="Connected players will be disconnected and the world is saved first."
        footer={
          <>
            <TerButton variant="ghost" onClick={() => setConfirmRestart(false)}>
              Cancel
            </TerButton>
            <TerButton variant="danger" icon="restart" loading={action === 'restart'} onClick={handleRestart}>
              Restart
            </TerButton>
          </>
        }
      />
    </div>
  )
}
