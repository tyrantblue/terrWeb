import {
  Activity,
  Gamepad2,
  LayoutDashboard,
  Terminal,
  Globe,
  Users,
  Settings,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import {
  NavLink,
  Outlet,
} from 'react-router-dom'
import ApiCompatibilityBanner from '../components/ApiCompatibilityBanner'
import { CAPABILITIES, useApiMeta } from '../context/apiMeta'
import { useServerStatus } from '../context/serverStatus'


export default function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] =
    useState(false)

  const { status, connectivity, error, lastUpdated } =
    useServerStatus()

  const { hasCapability } = useApiMeta()

  // A backend that does not advertise the console has no /api/v1/console
  // surface at all, so offering the page would only produce 404s.
  const consoleAvailable = hasCapability(CAPABILITIES.serverConsole)

  const serverOnline = connectivity === 'online'

  // `offline` (API reachable, game server down) is amber, not red —
  // only an unreachable API is a panel-level failure.
  const tone: StatusTone = connectivity === 'unreachable'
    ? 'offline'
    : connectivity === 'connecting'
      ? 'pending'
      : connectivity === 'online'
        ? 'online'
        : 'idle'

  const statusLabel = tone === 'pending'
    ? 'Checking...'
    : tone === 'offline'
      ? 'API Unreachable'
      : serverOnline
        ? 'Server Online'
        : 'Server Stopped'

  useEffect(() => {
    if (!mobileNavOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  return (
    <div
      className={[
        'min-h-screen',
        'bg-[#111315]',
        'text-gray-100',
      ].join(' ')}
    >

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0',
          'z-40 w-72',
          'border-r border-white/[0.07]',
          'bg-[#151719]',
          'shadow-2xl shadow-black/40',
          'transition-transform duration-200',
          mobileNavOpen
            ? 'translate-x-0'
            : '-translate-x-full',
          'md:w-64 md:translate-x-0',
          'md:shadow-none',
        ].join(' ')}
      >

        {/* Logo */}
        <div
          className={[
            'flex h-16 items-center',
            'gap-3',
            'border-b border-white/[0.07]',
            'px-5',
          ].join(' ')}
        >

          <div
            className={[
              'relative flex h-9 w-9',
              'items-center justify-center',
              'overflow-hidden',
              'rounded-lg',
              'bg-emerald-500/10',
              'text-emerald-400',
            ].join(' ')}
          >

            <div
              className={[
                'absolute inset-0',
                'bg-emerald-400/5',
              ].join(' ')}
            />

            <Gamepad2
              size={21}
              strokeWidth={1.8}
              className="relative"
            />

          </div>


          <div>
            <div
              className={[
                'font-semibold',
                'tracking-wide',
                'text-gray-100',
              ].join(' ')}
            >
              Terraria
            </div>

            <div className="mt-0.5 text-[11px] text-gray-600">
              Server Panel
            </div>
          </div>

          <button
            type="button"
            className="ui-icon-button ml-auto h-9 w-9 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>

        </div>


        {/* Navigation */}
        <nav className="h-[calc(100vh-4rem)] space-y-1.5 overflow-y-auto p-3 pb-24">

          <NavItem
            to="/"
            icon={
              <LayoutDashboard
                size={18}
              />
            }
            label="Dashboard"
            onNavigate={() => setMobileNavOpen(false)}
          />

          <NavItem
            to="/worlds"
            icon={
              <Globe size={18} />
            }
            label="Worlds"
            onNavigate={() => setMobileNavOpen(false)}
          />

          <NavItem
            to="/players"
            icon={
              <Users size={18} />
            }
            label="Players"
            onNavigate={() => setMobileNavOpen(false)}
          />

          {consoleAvailable && (
            <NavItem
              to="/console"
              icon={
                <Terminal size={18} />
              }
              label="Console"
              onNavigate={() => setMobileNavOpen(false)}
            />
          )}
          <NavItem
            to="/operations"
            icon={
              <ShieldCheck size={18} />
            }
            label="Operations"
            onNavigate={() => setMobileNavOpen(false)}
          />

          <NavItem
            to="/settings"
            icon={
              <Settings size={18} />
            }
            label="Settings"
            onNavigate={() => setMobileNavOpen(false)}
          />

        </nav>


        {/* Server status */}
        <div
          className={[
            'absolute bottom-0 hidden',
            'left-0 right-0',
            'border-t border-white/[0.07]',
            'p-4',
            'md:block',
          ].join(' ')}
        >

          <div
            className={[
              'ui-panel-subtle',
              STATUS_TONES[tone].panel,
              'px-3 py-2.5',
            ].join(' ')}
            title={error?.message}
          >

            <div className="flex items-center gap-2.5">

              <span
                className={[
                  'relative flex h-2 w-2',
                ].join(' ')}
              >

                {serverOnline && (
                  <span
                    className={[
                      'absolute inline-flex',
                      'h-full w-full',
                      'animate-ping',
                      'rounded-full',
                      'bg-emerald-400/40',
                    ].join(' ')}
                  />
                )}

                <span
                  className={[
                    'relative inline-flex',
                    'h-2 w-2',
                    'rounded-full',
                    STATUS_TONES[tone].dot,
                  ].join(' ')}
                />

              </span>

              <span
                className={[
                  'text-xs font-medium',
                  STATUS_TONES[tone].text,
                ].join(' ')}
              >
                {statusLabel}
              </span>

            </div>

            {status && (
              <div className="mt-1.5 pl-[18px] text-[11px] text-gray-600">
                {status.players.online}/{status.max_players ?? '—'} online
                {status.port ? ` · port ${status.port}` : ''}
                {connectivity === 'unreachable'
                  ? ` · last known ${formatClock(lastUpdated)}`
                  : ''}
              </div>
            )}

          </div>

        </div>

      </aside>


      {/* Main */}
      <main className="min-h-screen md:ml-64">

        {/* Header */}
        <header
          className={[
            'sticky top-0 z-10',
            'flex h-16',
            'items-center justify-between',
            'border-b border-white/[0.07]',
            'bg-[#111315]/90',
            'px-4 md:px-8',
            'backdrop-blur-xl',
          ].join(' ')}
        >

          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="ui-icon-button h-9 w-9 shrink-0 md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={18} />
            </button>

            <h1
              className={[
                'text-sm font-medium',
                'text-gray-300',
              ].join(' ')}
            >
              Terraria Server
            </h1>
          </div>


          <div
            className={[
              'flex items-center',
              'gap-2',
              'rounded-full',
              'border border-white/[0.06]',
              'bg-white/[0.025]',
              'px-3 py-1.5',
              'text-xs text-gray-500',
            ].join(' ')}
          >

            <Activity
              size={14}
              className={
                connectivity === 'unreachable'
                  ? 'text-red-400'
                  : connectivity === 'connecting'
                    ? 'text-gray-500'
                    : 'text-emerald-400'
              }
            />

            <span>
              {connectivity === 'unreachable'
                ? 'Disconnected'
                : connectivity === 'connecting'
                  ? 'Connecting'
                  : 'Connected'}
            </span>

          </div>

        </header>

        <ApiCompatibilityBanner />


        {/* Page content */}
        <div className="p-4 md:p-6 lg:p-8">

          <div className="mx-auto max-w-[1440px]">
            <Outlet />
          </div>

        </div>

      </main>

    </div>
  )
}


function NavItem({
  to,
  icon,
  label,
  onNavigate,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group relative',
          'flex min-w-0 w-full',
          'items-center justify-start gap-3',
          'rounded-[var(--ui-radius-control)]',
          'px-3 py-2.5',
          'text-sm',
          'transition-all duration-150',

          isActive
            ? [
                'bg-white/[0.075]',
                'text-gray-100',
              ].join(' ')
            : [
                'text-gray-500',
                'hover:bg-white/[0.035]',
                'hover:text-gray-300',
              ].join(' '),
        ].join(' ')
      }
    >

      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className={[
                'absolute left-0',
                'h-5 w-0.5',
                'rounded-r-full',
                'bg-emerald-400',
              ].join(' ')}
            />
          )}

          <span
            className={[
              'transition-colors',
              isActive
                ? 'text-emerald-400'
                : 'text-gray-600',
              !isActive
                ? 'group-hover:text-gray-400'
                : '',
            ].join(' ')}
          >
            {icon}
          </span>

          <span>
            {label}
          </span>

        </>
      )}

    </NavLink>
  )
}


/* ------------------------------ */
/* Server status tones             */
/* ------------------------------ */

function formatClock(value: number | null) {
  if (value === null) {
    return 'unknown'
  }

  return new Date(value).toLocaleTimeString()
}

type StatusTone =
  | 'online'
  | 'idle'
  | 'offline'
  | 'pending'

const STATUS_TONES: Record<
  StatusTone,
  { panel: string; dot: string; text: string }
> = {
  online: {
    panel: 'border-emerald-500/10 bg-emerald-500/[0.04]',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400/80',
  },
  idle: {
    panel: 'border-amber-500/10 bg-amber-500/[0.04]',
    dot: 'bg-amber-400',
    text: 'text-amber-400/80',
  },
  offline: {
    panel: 'border-red-500/10 bg-red-500/[0.04]',
    dot: 'bg-red-400',
    text: 'text-red-400/80',
  },
  pending: {
    panel: 'border-white/[0.07] bg-white/[0.02]',
    dot: 'bg-gray-500',
    text: 'text-gray-500',
  },
}
