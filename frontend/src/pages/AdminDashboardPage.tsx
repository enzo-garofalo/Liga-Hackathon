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
    <div className="min-h-screen bg-gray-50">
      <Header admin />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-near-black">
              Painel do administrador
            </h1>
            <p className="text-sm text-silver-blue font-ui">
              {approvedCount}/10 equipes aprovadas
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium font-ui text-near-black">Filtrar por</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TeamStatus)}
              className="px-3 py-2 rounded-xl border border-[#dedee5] bg-white font-ui text-sm text-near-black focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mutationError && (
          <p className="text-sm text-red-500 font-ui">{getApiError(mutationError)}</p>
        )}

        {teamsQuery.isLoading && (
          <p className="font-ui text-silver-blue">Carregando equipes...</p>
        )}
        {teamsQuery.data && teams.length === 0 && (
          <p className="font-ui text-silver-blue">
            Nenhuma equipe com status "{STATUS_LABEL[statusFilter].toLowerCase()}".
          </p>
        )}

        <div className="space-y-4">
          {teams.map((team) => (
            <article
              key={team.id}
              className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-6"
            >
              <header className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-near-black">
                    {team.name}
                  </h2>
                  <p className="text-xs text-silver-blue font-ui mt-1">
                    Líder: <span className="text-near-black">{team.leader.full_name}</span>
                    {' · '}
                    {team.member_count}/4 membros
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[team.status]}>
                  {STATUS_LABEL[team.status]}
                </Badge>
              </header>

              <ul className="text-sm font-ui text-near-black space-y-1 mb-4">
                {team.members.map((m) => (
                  <li key={m.id}>
                    {m.full_name}{' '}
                    <span className="text-silver-blue">
                      · {m.course} · {m.semester}º sem
                    </span>
                  </li>
                ))}
              </ul>

              {team.status === 'submitted' && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(team)}
                    loading={
                      approveMutation.isPending && approveMutation.variables === team.id
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleReject(team)}
                    loading={
                      rejectMutation.isPending && rejectMutation.variables === team.id
                    }
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
