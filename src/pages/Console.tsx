import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  Circle,
  History,
  RefreshCw,
  Send,
  Terminal,
  Trash2,
} from 'lucide-react'

import {
  createConsoleWebSocket,
  getConsole,
  getConsoleAudit,
  sendCommand,
  type AuditEntry,
  type ConsoleLine,
} from '../api/console'
import { formatErrorReport } from '../api/errors'
import { CAPABILITIES, useApiMeta } from '../context/apiMeta'

/**
 * A console line tagged with a stable identity. Server offsets are the
 * natural key.
 *
 * API 2.0.0 fixed the replay so it carries real offsets (terraria-server
 * issue #7), so the `replay:` fallback below is now a compatibility path
 * for 1.x backends, which replayed history with `offset: -1` and would
 * otherwise collapse the whole replay into one entry.
 */
type ConsoleEntry = ConsoleLine & { key: string }

const REPLAY_KEY_PREFIX = 'replay:'


export default function Console() {
  const [lines, setLines] =
    useState<ConsoleEntry[]>([])

  const [command, setCommand] =
    useState('')

  const [sending, setSending] =
    useState(false)

  const [connected, setConnected] =
    useState(false)

  const [error, setError] =
    useState(false)

  const [commandError, setCommandError] =
    useState('')

  const [audit, setAudit] =
    useState<AuditEntry[]>([])

  const [auditError, setAuditError] =
    useState('')

  const [showAudit, setShowAudit] =
    useState(false)

  const { hasCapability } = useApiMeta()

  const consoleAvailable = hasCapability(
    CAPABILITIES.serverConsole,
  )

  // A backend without persistent audit has no /api/v1/console/audit
  // route at all, so offering the tab would only produce a 404 banner.
  const auditAvailable = hasCapability(
    CAPABILITIES.consoleAudit,
  )


  const terminalRef =
    useRef<HTMLDivElement>(null)

  const inputRef =
    useRef<HTMLInputElement>(null)

  const socketRef =
    useRef<WebSocket | null>(null)

  const cursorRef =
    useRef<number | undefined>(undefined)

  const replaySeqRef =
    useRef(0)


  async function loadAudit() {
    try {
      const response = await getConsoleAudit()

      setAudit(response.entries)
      setAuditError('')
    } catch (error) {
      console.error(
        'Failed to load the command audit:',
        error,
      )

      setAuditError(formatErrorReport(error))
    }
  }


  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    const value =
      command.trim()

    if (!value || sending) {
      return
    }

    if (/^exit(?:-nosave)?$/i.test(value)) {
      setCommandError(
        'Shutdown commands are blocked. Use a managed server action instead.',
      )
      return
    }

    try {
      setSending(true)
      setCommandError('')

      await sendCommand(value)

      setCommand('')

      inputRef.current?.focus()

      // The command just became an audit entry.
      if (auditAvailable) {
        void loadAudit()
      }

    } catch (error) {
      console.error(
        'Failed to send command:',
        error,
      )

      setCommandError(formatErrorReport(error))

    } finally {
      setSending(false)
    }
  }


  function clearConsole() {
    setLines([])
  }


  useEffect(() => {
    if (!auditAvailable) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadAudit()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [auditAvailable])


  useEffect(() => {
    // No console surface on this backend; do not open a socket for it.
    if (!consoleAvailable) {
      return
    }

    let disposed = false
    let reconnectTimer: number | undefined

    function toEntries(
      incoming: ConsoleLine[],
    ): ConsoleEntry[] {
      return incoming.map((line) => {
        if (line.offset >= 0) {
          return {
            ...line,
            key: `offset:${line.offset}`,
          }
        }

        const sequence = replaySeqRef.current

        replaySeqRef.current += 1

        return {
          ...line,
          key: `${REPLAY_KEY_PREFIX}${sequence}`,
        }
      })
    }

    /**
     * Replayed lines carry no server identity, so once authoritative
     * offsets arrive over REST the placeholders are dropped rather than
     * left behind as duplicate-looking rows.
     */
    function mergeEntries(
      current: ConsoleEntry[],
      incoming: ConsoleEntry[],
      dropReplay: boolean,
    ): ConsoleEntry[] {
      const source = dropReplay
        ? current.filter(
            (entry) =>
              !entry.key.startsWith(REPLAY_KEY_PREFIX),
          )
        : current

      const byKey = new Map(
        source.map(
          (entry) => [entry.key, entry],
        ),
      )

      for (const entry of incoming) {
        byKey.set(entry.key, entry)
      }

      return Array.from(byKey.values())
        .sort(
          (left, right) =>
            left.offset - right.offset,
        )
        .slice(-1000)
    }

    function appendLines(newLines: ConsoleLine[]) {
      if (newLines.length === 0) {
        return
      }

      const entries = toEntries(newLines)

      setLines((current) =>
        mergeEntries(current, entries, false),
      )
    }

    async function catchUp(
      since: number | undefined = cursorRef.current,
    ) {
      const response = await getConsole(since)

      cursorRef.current = Math.max(
        cursorRef.current ?? 0,
        response.cursor,
      )

      const entries = toEntries(response.lines)

      setLines((current) =>
        mergeEntries(current, entries, true),
      )
    }

    function connect() {
      if (disposed) return

      const socket = createConsoleWebSocket()
      socketRef.current = socket

      socket.onopen = () => {
        if (disposed) return
        setConnected(true)
        setError(false)
        void catchUp().catch(console.error)
      }

      socket.onmessage = (event) => {
        if (disposed) return

        let message: {
          type?: string
          cursor?: number
          offset?: number
          ts?: number | null
          kind?: string
          text?: string
        }

        try {
          message = JSON.parse(String(event.data))
        } catch {
          return
        }

        if (message.type === 'hello') {
          if (typeof message.cursor !== 'number') {
            return
          }

          const cursor = message.cursor
          const known = cursorRef.current

          if (known === undefined) {
            cursorRef.current = cursor
            return
          }

          if (cursor > known) {
            // Output produced between the REST catch-up and this
            // subscription would otherwise be lost.
            void catchUp(known).catch(console.error)
          }

          return
        }

        if (
          message.type !== 'console.line' ||
          typeof message.text !== 'string'
        ) return

        const offset =
          typeof message.offset === 'number'
            ? message.offset
            : -1

        if (
          offset < 0 &&
          cursorRef.current !== undefined
        ) {
          // 1.x only: replay of history the REST catch-up already loaded
          // with real offsets. Keeping it would add a phantom entry
          // pinned to the top of the terminal. Unreachable on 2.x.
          return
        }

        if (offset >= 0) {
          cursorRef.current = Math.max(
            cursorRef.current ?? 0,
            offset,
          )
        }

        appendLines([{
          offset,
          ts: message.ts ?? null,
          kind: message.kind ?? 'output',
          text: message.text,
        }])
      }

      socket.onerror = () => {
        if (!disposed) setError(true)
      }

      socket.onclose = () => {
        if (disposed) return
        setConnected(false)
        reconnectTimer = window.setTimeout(
          connect,
          2000,
        )
      }
    }

    catchUp()
      .catch((loadError) => {
        console.error(
          'Failed to load console history:',
          loadError,
        )
      })
      .finally(connect)


    return () => {
      disposed = true
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
      }

      socketRef.current?.close()

      socketRef.current = null
    }
  }, [consoleAvailable])


  useEffect(() => {
    const element =
      terminalRef.current

    if (!element) {
      return
    }

    element.scrollTop =
      element.scrollHeight
  }, [lines])


  const connectionLabel =
    connected
      ? 'Live'
      : error
        ? 'Connection Error'
        : 'Connecting...'


  const connectionClass =
    connected
      ? 'text-emerald-400'
      : error
        ? 'text-red-400'
        : 'text-gray-500'


  // All hooks have run by this point, so an early return is safe.
  if (!consoleAvailable) {
    return (
      <div className="space-y-6">
        <section
          className={[
            'ui-panel',
            'px-5 py-10',
            'text-center',
          ].join(' ')}
        >
          <div className="mb-3 flex justify-center text-gray-600">
            <Terminal size={22} />
          </div>
          <div className="text-sm text-gray-400">
            This backend does not support the server console.
          </div>
          <div className="mt-1.5 text-xs text-gray-600">
            Its API does not advertise the{' '}
            <span className="font-mono">
              {CAPABILITIES.serverConsole}
            </span>{' '}
            capability.
          </div>
        </section>
      </div>
    )
  }


  return (
    <div className="space-y-6">

      {/* Page heading */}
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
              <Terminal size={20} />
            </div>

            <div>

              <h2 className="ui-page-title">
                Console
              </h2>

              <p className="ui-page-description">
                Terraria server console
              </p>

            </div>

          </div>

        </div>


        {/* Connection state */}
        <div
          className={[
            'flex items-center gap-2',
            'rounded-full',
            'border border-white/[0.06]',
            'bg-white/[0.025]',
            'px-3 py-1.5',
            'text-xs',
            connectionClass,
          ].join(' ')}
        >

          <Circle
            size={8}
            fill="currentColor"
          />

          {connectionLabel}

        </div>

      </div>


      {/* Terminal */}
      <div
        className={[
          'overflow-hidden',
          'rounded-xl',
          'border border-white/[0.08]',
          'bg-[#0c0e0f]',
          'shadow-2xl',
          'shadow-black/20',
        ].join(' ')}
      >

        {/* Terminal header */}
        <div
          className={[
            'flex h-11',
            'items-center',
            'justify-between',
            'border-b border-white/[0.07]',
            'bg-[#151719]',
            'px-4',
          ].join(' ')}
        >

          <div className="flex items-center gap-2">

            <div className="flex gap-1.5">

              <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />

              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />

              <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />

            </div>


            <span className="ml-2 text-xs text-gray-600">
              Terraria Server
            </span>

          </div>


          <div className="flex items-center gap-1">

            {auditAvailable && (
              <button
                onClick={() => setShowAudit((current) => !current)}
                className={[
                  'flex items-center gap-2',
                  'rounded-md',
                  'px-2.5 py-1.5',
                  'text-xs',
                  'transition',
                  showAudit
                    ? 'bg-white/[0.06] text-gray-200'
                    : 'text-gray-600',
                  !showAudit
                    ? 'hover:bg-white/5 hover:text-gray-300'
                    : '',
                ].join(' ')}
                aria-pressed={showAudit}
              >
                <History size={14} />

                Audit
                {audit.length > 0 && (
                  <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-gray-400">
                    {audit.length}
                  </span>
                )}

              </button>
            )}


            <button
              onClick={clearConsole}
              className={[
                'flex items-center gap-2',
                'rounded-md',
                'px-2.5 py-1.5',
                'text-xs text-gray-600',
                'transition',
                'hover:bg-white/5',
                'hover:text-gray-300',
              ].join(' ')}
            >
              <Trash2 size={14} />

              Clear
            </button>

          </div>

        </div>


        {/* Output */}
        <div
          ref={terminalRef}
          className={[
            'h-[560px]',
            'overflow-y-auto',
            'p-4',
            'font-mono text-sm',
            'leading-6',
          ].join(' ')}
        >

          {lines.length === 0 ? (

            <div className="text-gray-700">
              {connected
                ? 'Waiting for server output...'
                : error
                  ? 'Unable to connect to server.'
                  : 'Connecting to server...'}
            </div>

          ) : (

            lines.map(
              (line) => (
                <div
                  key={line.key}
                  className={[
                    'whitespace-pre-wrap',
                    'break-all',
                    getConsoleLineClass(line.kind),
                  ].join(' ')}
                >
                  {line.text}
                </div>
              ),
            )

          )}

        </div>


        {/* Command input */}
        <form
          onSubmit={handleSubmit}
          className={[
            'flex items-center',
            'border-t border-white/[0.07]',
            'bg-[#111315]',
            'px-4 py-3',
          ].join(' ')}
        >

          <span
            className={[
              'mr-3',
              'font-mono text-sm',
              'text-emerald-400/80',
            ].join(' ')}
          >
            &gt;
          </span>


          <input
            ref={inputRef}
            value={command}
            onChange={(event) =>
              setCommand(
                event.target.value,
              )
            }
            disabled={sending}
            placeholder="Enter Terraria command..."
            className={[
              'min-w-0 flex-1',
              'bg-transparent',
              'font-mono text-sm',
              'text-gray-200',
              'outline-none',
              'placeholder:text-gray-700',
            ].join(' ')}
          />


          <button
            type="submit"
            disabled={
              sending ||
              !command.trim()
            }
            className={[
              'ml-3 flex items-center',
              'gap-2 rounded-lg',
              'bg-emerald-500/10',
              'px-3 py-2',
              'text-sm text-emerald-400',
              'transition',
              'hover:bg-emerald-500/20',
              'disabled:cursor-not-allowed',
              'disabled:opacity-40',
            ].join(' ')}
          >

            <Send size={15} />

            {sending
              ? 'Sending...'
              : 'Send'}

          </button>

        </form>

        {commandError && (
          <div className="border-t border-red-500/10 bg-red-500/[0.04] px-4 py-2 text-xs text-red-400">
            {commandError}
          </div>
        )}

      </div>


      {/* Command audit */}
      {showAudit && (
        <section
          className={[
            'rounded-xl',
            'border border-white/[0.07]',
            'bg-[#17191c]',
            'p-5',
          ].join(' ')}
        >

          <div className="mb-4 flex items-center justify-between gap-3">

            <div className="flex items-center gap-2.5">

              <div
                className={[
                  'flex h-8 w-8',
                  'items-center justify-center',
                  'rounded-lg',
                  'bg-white/[0.04]',
                  'text-gray-400',
                ].join(' ')}
              >
                <History size={16} />
              </div>

              <div>
                <h3 className="font-medium text-gray-200">
                  Command Audit
                </h3>
                <p className="mt-0.5 text-xs text-gray-600">
                  Commands accepted through this API, newest first
                </p>
              </div>

            </div>


            <button
              onClick={() => void loadAudit()}
              className="ui-button ui-button-secondary"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

          </div>


          {auditError ? (

            <div className="rounded-lg border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-sm text-red-400">
              {auditError}
            </div>

          ) : audit.length === 0 ? (

            <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] py-10 text-center text-sm text-gray-600">
              No commands have been run yet.
            </div>

          ) : (

            <div className="ui-scroll-region divide-y divide-white/[0.05] border-y border-white/[0.07] pr-1">

              {audit.map((entry, index) => (
                <div
                  key={`${entry.ts}-${entry.command}-${index}`}
                  className="flex items-start justify-between gap-4 py-3"
                >

                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm text-gray-300">
                      {entry.command}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-600">
                      {entry.actor}
                    </div>
                  </div>


                  <div className="shrink-0 text-xs text-gray-600">
                    {formatAuditTime(entry.ts)}
                  </div>

                </div>
              ))}

            </div>

          )}

        </section>
      )}


      {/* Quick commands */}
      <div>

        <div
          className={[
            'mb-2.5',
            'text-xs font-medium',
            'text-gray-600',
          ].join(' ')}
        >
          Quick commands
        </div>

        <div className="flex flex-wrap gap-2">

          {[
            'playing',
            'version',
            'time',
            'save',
            'seed',
            'settle',
          ].map((item) => (
            <button
              key={item}
              onClick={() =>
                setCommand(item)
              }
              className={[
                'rounded-md',
                'border border-white/[0.07]',
                'bg-white/[0.025]',
                'px-3 py-1.5',
                'font-mono text-xs',
                'text-gray-500',
                'transition',
                'hover:border-white/10',
                'hover:bg-white/[0.05]',
                'hover:text-gray-300',
              ].join(' ')}
            >
              {item}
            </button>
          ))}

        </div>

      </div>

    </div>
  )
}

/**
 * Audit timestamps are epoch seconds from the API; tolerate a
 * millisecond value in case the contract widens.
 */
function formatAuditTime(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) {
    return '—'
  }

  const milliseconds = ts < 1e12 ? ts * 1000 : ts

  return new Date(milliseconds).toLocaleString()
}


function getConsoleLineClass(kind: string) {
  switch (kind) {
    case 'error':
      return 'text-red-400'
    case 'chat':
      return 'text-cyan-300'
    case 'player_join':
      return 'text-emerald-400'
    case 'player_leave':
    case 'disconnect':
      return 'text-amber-400'
    case 'prompt':
      return 'text-gray-600'
    default:
      return 'text-gray-400'
  }
}
