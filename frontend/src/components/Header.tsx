import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { useLogout } from '../hooks/useAuth'
import type { MeProfile } from '../types/participant'
import { DeadlineBanner } from './DeadlineBanner'
import { NotificationBell } from './NotificationBell'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface HeaderProps {
  me?: MeProfile
  admin?: boolean
}

export function Header({ me, admin = false }: HeaderProps) {
  const logout = useLogout()
  return (
    <>
      <header className="bg-white border-b border-[#dedee5] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to={admin ? '/admin/dashboard' : me ? '/dashboard' : '/'} className="flex items-center gap-3">
            <img src={logo} alt="Liga de TI" className="h-7" />
            <span className="font-display font-semibold text-near-black text-2xl">Liga de TI</span>
          </Link>
          {admin ? (
            <div className="flex items-center gap-3">
              <Badge variant="pending">Admin</Badge>
              <Button variant="ghost" onClick={logout}>
                Sair
              </Button>
            </div>
          ) : me ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link
                to="/profile"
                className="font-ui text-sm text-near-black hover:text-brand"
              >
                {me.full_name}
              </Link>
              <Button variant="ghost" onClick={logout}>
                Sair
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">Cadastrar</Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      {me && <DeadlineBanner />}
    </>
  )
}
