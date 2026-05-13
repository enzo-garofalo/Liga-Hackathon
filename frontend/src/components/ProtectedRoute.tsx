import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!sessionStorage.getItem('access_token')) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}
