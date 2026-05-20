import { Outlet } from 'react-router-dom'

interface ProtectedRouteProps {
  children?: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  void requireAdmin

  // Auth bypass temporario para revisar todas as views localmente.
  // const token = getAccessToken()
  // const kind = getSessionKind()
  //
  // if (!token) {
  //   return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />
  // }
  // if (requireAdmin && kind !== 'admin') {
  //   return <Navigate to="/admin/login" replace />
  // }
  // if (!requireAdmin && kind !== 'participant') {
  //   return <Navigate to="/login" replace />
  // }

  return children ? <>{children}</> : <Outlet />
}
