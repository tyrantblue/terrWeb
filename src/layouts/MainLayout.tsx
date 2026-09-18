import {
  Activity,
  Gamepad2,
  LayoutDashboard,
  Terminal,
  Globe,
  Users,
  Settings,
  ShieldCheck,
} from 'lucide-react'

import {
  NavLink,
  Outlet,
} from 'react-router-dom'
import ApiCompatibilityBanner from '../components/ApiCompatibilityBanner'


export default function MainLayout() {
  return (
    <div
      className={[
        'min-h-screen',
        'bg-[#111315]',
        'text-gray-100',
      ].join(' ')}
    >

      {/* Sidebar */}
      <aside
        className={[
          'fixed bottom-0 left-0 right-0',
          'z-20 h-16',
          'border-t border-white/[0.07]',
          'bg-[#151719]',
          'md:inset-y-0 md:right-auto',
          'md:h-auto md:w-64',
          'md:border-r md:border-t-0',
        ].join(' ')}
      >

        {/* Logo */}
        <div
          className={[
            'hidden h-16 items-center',
            'gap-3',
            'border-b border-white/[0.07]',
            'px-5',
            'md:flex',
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

        </div>


        {/* Navigation */}
        <nav className="grid h-full grid-cols-6 px-1 md:block md:h-auto md:space-y-1.5 md:p-3">

          <NavItem
            to="/"
            icon={
              <LayoutDashboard
                size={18}
              />
            }
            label="Dashboard"
          />

          <NavItem
            to="/worlds"
            icon={
              <Globe size={18} />
            }
            label="Worlds"
          />

          <NavItem
            to="/players"
            icon={
              <Users size={18} />
            }
            label="Players"
          />

          <NavItem
            to="/console"
            icon={
              <Terminal size={18} />
            }
            label="Console"
          />

          <NavItem
            to="/operations"
            icon={
              <ShieldCheck size={18} />
            }
            label="Operations"
          />

          <NavItem
            to="/settings"
            icon={
              <Settings size={18} />
            }
            label="Settings"
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
              'border-emerald-500/10',
              'bg-emerald-500/[0.04]',
              'px-3 py-2.5',
            ].join(' ')}
          >

            <div className="flex items-center gap-2.5">

              <span
                className={[
                  'relative flex h-2 w-2',
                ].join(' ')}
              >

                <span
                  className={[
                    'absolute inline-flex',
                    'h-full w-full',
                    'animate-ping',
                    'rounded-full',
                    'bg-emerald-400/40',
                  ].join(' ')}
                />

                <span
                  className={[
                    'relative inline-flex',
                    'h-2 w-2',
                    'rounded-full',
                    'bg-emerald-400',
                  ].join(' ')}
                />

              </span>

              <span className="text-xs font-medium text-emerald-400/80">
                Server Online
              </span>

            </div>

          </div>

        </div>

      </aside>


      {/* Main */}
      <main className="min-h-screen pb-16 md:ml-64 md:pb-0">

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

          <div>
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
              className="text-emerald-400"
            />

            <span>
              Connected
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
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'group relative',
          'flex h-full min-w-0 w-full',
          'flex-col items-center justify-center gap-1',
          'rounded-[var(--ui-radius-control)]',
          'px-1 py-1.5',
          'text-[10px]',
          'transition-all duration-150',
          'md:h-auto md:flex-row md:justify-start',
          'md:gap-3 md:px-3 md:py-2.5',
          'md:text-sm',

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
                'absolute bottom-0',
                'h-0.5 w-5',
                'rounded-t-full',
                'bg-emerald-400',
                'md:bottom-auto md:left-0',
                'md:h-5 md:w-0.5',
                'md:rounded-r-full',
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
