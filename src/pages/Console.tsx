import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  Circle,
  Send,
  Terminal,
  Trash2,
} from 'lucide-react'

import {
  createConsoleWebSocket,
  sendCommand,
} from '../api/console'


export default function Console() {
  const [lines, setLines] =
    useState<string[]>([])

  const [command, setCommand] =
    useState('')

  const [sending, setSending] =
    useState(false)

  const [connected, setConnected] =
    useState(false)

  const [error, setError] =
    useState(false)


  const terminalRef =
    useRef<HTMLDivElement>(null)

  const inputRef =
    useRef<HTMLInputElement>(null)

  const socketRef =
    useRef<WebSocket | null>(null)


  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    const value =
      command.trim()

    if (!value || sending) {
      return
    }

    try {
      setSending(true)

      await sendCommand(value)

      setCommand('')

      inputRef.current?.focus()

    } catch (error) {
      console.error(
        'Failed to send command:',
        error,
      )

    } finally {
      setSending(false)
    }
  }


  function clearConsole() {
    setLines([])
  }


  useEffect(() => {
    let disposed = false

    const socket =
      createConsoleWebSocket()

    socketRef.current = socket


    socket.onopen = () => {
      if (disposed) {
        return
      }

      setConnected(true)
      setError(false)
    }


    socket.onmessage = (
      event,
    ) => {
      if (disposed) {
        return
      }

      const text =
        String(event.data)

      const newLines =
        text.split(/\r?\n/)

      setLines((previous) => {
        const combined = [
          ...previous,
          ...newLines,
        ]

        return combined.slice(-1000)
      })
    }


    socket.onerror = () => {
      if (disposed) {
        return
      }

      setError(true)
    }


    socket.onclose = () => {
      if (disposed) {
        return
      }

      setConnected(false)
    }


    return () => {
      disposed = true

      socket.close()

      socketRef.current = null
    }
  }, [])


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
              (line, index) => (
                <div
                  key={`${index}-${line}`}
                  className={[
                    'whitespace-pre-wrap',
                    'break-all',
                    'text-gray-400',
                  ].join(' ')}
                >
                  {line}
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

      </div>


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
