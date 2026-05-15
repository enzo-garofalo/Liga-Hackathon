import { Navigate } from 'react-router-dom'
import { getAccessToken, getSessionKind } from '../auth/storage'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const token = getAccessToken()
  const kind = getSessionKind()

  if (!token) {
    return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />
  }
  if (requireAdmin && kind !== 'admin') {
    return <Navigate to="/admin/login" replace />
  }
  if (!requireAdmin && kind !== 'participant') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
