import { useState } from 'react'
import { Header } from '../components/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  useAdminTeams,
  useApproveTeam,
  useRejectTeam,
} from '../hooks/useAdminDashboard'
import type { Team, TeamStatus } from '../types/team'
import { getApiError } from '../utils/errors'

const STATUS_OPTIONS: TeamStatus[] = ['submitted', 'approved', 'rejected', 'forming']

const STATUS_LABEL: Record<TeamStatus, string> = {
  submitted: 'Submetidas',
  approved: 'Aprovadas',
  rejected: 'Recusadas',
  forming: 'Em formação',
}

const STATUS_VARIANT: Record<TeamStatus, 'success' | 'neutral' | 'pending'> = {
  forming: 'pending',
  submitted: 'pending',
  approved: 'success',
  rejected: 'neutral',
}

export function AdminDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<TeamStatus>('submitted')
  const teamsQuery = useAdminTeams(statusFilter)
  const approvedQuery = useAdminTeams('approved')
  const approveMutation = useApproveTeam()
  const rejectMutation = useRejectTeam()

  const approvedCount = approvedQuery.data?.length ?? 0
  const teams = teamsQuery.data ?? []
  const mutationError = approveMutation.error ?? rejectMutation.error

  const handleApprove = (team: Team) => {
    if (!window.confirm(`Aprovar a equipe ${team.name}?`)) return
    approveMutation.mutate(team.id)
  }
  const handleReject = (team: Team) => {
    if (!window.confirm(`Recusar a equipe ${team.name}?`)) return
    rejectMutation.mutate(team.id)
  }

  return (
    <div className="min-h-screen app-shell text-ink">
      <Header admin />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-2">Administração</p>
            <h1 className="font-display text-4xl font-semibold text-ink">
              Painel do administrador
            </h1>
            <p className="mt-2 text-sm text-ink/50">
              {approvedCount}/10 equipes aprovadas
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink/62">Filtrar por</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TeamStatus)}
              className="rounded-xl border border-ink/12 bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mutationError && <p className="text-sm text-red-400">{getApiError(mutationError)}</p>}
        {teamsQuery.isLoading && <p className="text-ink/46">Carregando equipes...</p>}
        {teamsQuery.data && teams.length === 0 && (
          <p className="text-ink/46">
            Nenhuma equipe com status "{STATUS_LABEL[statusFilter].toLowerCase()}".
          </p>
        )}

        <div className="space-y-4">
          {teams.map((team) => (
            <article key={team.id} className="glass-panel rounded-2xl p-6">
              <header className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">{team.name}</h2>
                  <p className="mt-1 text-xs text-ink/46">
                    Líder: <span className="text-ink/80">{team.leader.full_name}</span>
                    {' - '}
                    {team.member_count}/4 membros
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[team.status]}>{STATUS_LABEL[team.status]}</Badge>
              </header>

              <ul className="mb-4 space-y-1 text-sm text-ink/78">
                {team.members.map((member) => (
                  <li key={member.id}>
                    {member.full_name}{' '}
                    <span className="text-ink/42">
                      - {member.course} - {member.semester} sem
                    </span>
                  </li>
                ))}
              </ul>

              {team.status === 'submitted' && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(team)}
                    loading={approveMutation.isPending && approveMutation.variables === team.id}
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleReject(team)}
                    loading={rejectMutation.isPending && rejectMutation.variables === team.id}
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
