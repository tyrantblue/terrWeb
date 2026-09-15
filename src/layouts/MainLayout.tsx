import {
  Activity,
  Gamepad2,
  LayoutDashboard,
  Terminal,
  Globe,
  Users,
  Settings,
} from 'lucide-react'

import {
  NavLink,
  Outlet,
} from 'react-router-dom'


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
          'fixed inset-y-0 left-0',
          'z-20 w-64',
          'border-r border-white/[0.07]',
          'bg-[#151719]',
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

        </div>


        {/* Navigation */}
        <nav className="space-y-1.5 p-3">

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
            'absolute bottom-0',
            'left-0 right-0',
            'border-t border-white/[0.07]',
            'p-4',
          ].join(' ')}
        >

          <div
            className={[
              'rounded-lg',
              'border border-emerald-500/10',
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
      <main className="ml-64 min-h-screen">

        {/* Header */}
        <header
          className={[
            'sticky top-0 z-10',
            'flex h-16',
            'items-center justify-between',
            'border-b border-white/[0.07]',
            'bg-[#111315]/90',
            'px-8',
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


        {/* Page content */}
        <div className="p-6 lg:p-8">

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
          'flex w-full',
          'items-center gap-3',
          'rounded-lg',
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