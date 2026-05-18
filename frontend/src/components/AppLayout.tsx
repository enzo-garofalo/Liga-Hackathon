import { useState, useMemo } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, User, Users, Bell, LogOut, Menu, X,
} from 'lucide-react'
import logo from '../assets/logo.svg'
import { useLogout } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useProfile } from '../hooks/useProfile'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const location  = useLocation()
  const logout    = useLogout()
  const profile   = useProfile()
  const notifQuery = useNotifications()

  const me     = profile.data
  const unread = useMemo(
    () => (notifQuery.data ?? []).filter(n => !n.read).length,
    [notifQuery.data],
  )

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       match: (p: string) => p === '/dashboard' },
    { to: '/profile',   icon: User,            label: 'Meu perfil',      match: (p: string) => p === '/profile' },
    { to: '/teams',     icon: Users,           label: 'Equipes abertas', match: (p: string) => p === '/teams' },
    { to: '/dashboard#notificacoes', icon: Bell, label: 'Notificações',  match: () => false, badge: unread > 0 ? unread : null },
    ...(me?.team ? [{ to: `/teams/${me.team.id}`, icon: Users, label: 'Minha equipe', match: (p: string) => p === `/teams/${me.team!.id}` }] : []),
  ]

  return (
    <aside className="flex flex-col h-full bg-white border-r border-[#dedee5]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#dedee5] flex-shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Liga de TI" className="h-7" />
          <span className="font-display font-semibold text-[#101114] text-sm">Liga de TI</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-[#9497a9] hover:text-[#101114]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="space-y-0.5 px-2">
          {navItems.map(({ to, icon: Icon, label, match, badge }) => {
            const active = match(location.pathname)
            return (
              <Link
                key={label}
                to={to}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative',
                  active
                    ? 'bg-[#7132f5]/10 text-[#7132f5] font-medium'
                    : 'text-[#686b82] hover:bg-gray-50 hover:text-[#101114]',
                ].join(' ')}
              >
                {active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#7132f5] rounded-l" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-ui flex-1">{label}</span>
                {badge != null && (
                  <span className="bg-[#7132f5] text-white text-[10px] font-semibold font-ui px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
        <hr className="border-[#dedee5] my-3 mx-4" />
      </nav>

      {/* Footer */}
      {me && (
        <div className="px-4 py-4 border-t border-[#dedee5] flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#7132f5] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold font-display">{initials(me.full_name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui font-medium text-xs text-[#101114] truncate">{me.full_name}</p>
              <p className="font-ui text-[10px] text-[#9497a9] truncate">{me.course}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs font-ui text-[#9497a9] hover:text-red-500 transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      )}
    </aside>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const notifQuery = useNotifications()
  const unread = useMemo(
    () => (notifQuery.data ?? []).filter(n => !n.read).length,
    [notifQuery.data],
  )

  return (
    <div className="flex h-screen bg-[#f8f8fa] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col h-full">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden flex flex-col shadow-xl">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-[#dedee5] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="text-[#686b82]">
              <Menu className="w-5 h-5" />
            </button>
            <img src={logo} alt="Liga de TI" className="h-6" />
          </div>
          <Link to="/dashboard#notificacoes" className="relative text-[#686b82]">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#7132f5] text-white text-[9px] rounded-full flex items-center justify-center font-semibold">
                {unread}
              </span>
            )}
          </Link>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
