import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { ManageProcessPage } from './pages/ManageProcessPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ProcessDetailPage } from './pages/ProcessDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { TeamDetailPage } from './pages/TeamDetailPage'
import { TeamsPage } from './pages/TeamsPage'

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Participant — protected + shared layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/processes/:id" element={<ProcessDetailPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamDetailPage />} />
        </Route>
      </Route>

      {/* Admin — protected, no shared layout */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/processes/:id"
        element={
          <ProtectedRoute requireAdmin>
            <ManageProcessPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
