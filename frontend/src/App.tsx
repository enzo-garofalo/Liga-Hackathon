import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CreateTeamPage } from './pages/CreateTeamPage'
import { DashboardPage } from './pages/DashboardPage'
import { InfoPage } from './pages/InfoPage'
import { InvitePage } from './pages/InvitePage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { TeamDetailPage } from './pages/TeamDetailPage'
import { TeamsPage } from './pages/TeamsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/info" element={<InfoPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/new"
        element={
          <ProtectedRoute>
            <CreateTeamPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:id"
        element={
          <ProtectedRoute>
            <TeamDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:id/invites"
        element={
          <ProtectedRoute>
            <InvitePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
