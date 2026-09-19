import {
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { SHOW_HACKATHON } from '../featureFlags'
import { useLogout } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { NotificationBell } from './NotificationBell'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const logout = useLogout()
  const profile = useProfile()
  const me = profile.data

  // Itens do hackathon (equipes). Desativado junto com o bloco do dashboard —
  // ver SHOW_HACKATHON em pages/DashboardPage.tsx. As rotas continuam existindo.
  const hackathonNav = SHOW_HACKATHON
    ? [
        { to: '/teams', icon: Users, label: 'Equipes abertas', match: (path: string) => path === '/teams' },
        ...(me?.team
          ? [
              {
                to: `/teams/${me.team.id}`,
                icon: Users,
                label: 'Minha equipe',
                match: (path: string) => path === `/teams/${me.team!.id}`,
              },
            ]
          : []),
      ]
    : []

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', match: (path: string) => path === '/dashboard' },
    { to: '/profile', icon: User, label: 'Meu perfil', match: (path: string) => path === '/profile' },
    ...hackathonNav,
  ]

  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-ink">
      <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5">
          <img src={logo} alt="Liga de TI" className="h-7 flex-shrink-0 brightness-0 invert" />
          <span className="whitespace-nowrap font-clash text-lg font-semibold text-white">Arena</span>
        </Link>
        {onClose ? (
          <button onClick={onClose} className="ml-auto text-white/50 transition-colors hover:text-white" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        ) : (
          <div className="ml-auto">
            <NotificationBell tone="dark" panelAlign="left" />
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <div className="space-y-0.5 px-2">
          {navItems.map(({ to, icon: Icon, label, match }) => {
            const active = match(location.pathname)
            return (
              <Link
                key={label}
                to={to}
                onClick={onClose}
                className={[
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-brand/20 font-semibold text-white'
                    : 'text-white/78 hover:bg-white/[0.08] hover:text-white',
                ].join(' ')}
              >
                {active && (
                  <div className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-l bg-brand" />
                )}
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 font-ui">{label}</span>
              </Link>
            )
          })}
        </div>
        <hr className="mx-4 my-3 border-white/10" />
      </nav>

      {me && (
        <div className="flex-shrink-0 border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand">
              <span className="font-display text-xs font-semibold text-white">{initials(me.full_name)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-ui text-xs font-medium text-white">{me.full_name}</p>
              <p className="truncate font-ui text-[10px] text-white/68">{me.course}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 font-ui text-xs text-white/72 transition-colors hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      )}
    </aside>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <div className="hidden h-full w-64 flex-shrink-0 flex-col md:flex">
        <Sidebar />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-xl md:hidden">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 bg-ink px-4 md:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="text-white/62 transition-colors hover:text-white" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <img src={logo} alt="Liga de TI" className="h-6 brightness-0 invert" />
          </div>
          <NotificationBell tone="dark" />
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
