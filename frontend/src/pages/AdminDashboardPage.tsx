import { useMemo, useState } from 'react'
import { ExternalLink, Eye, Search, X } from 'lucide-react'
import { Header } from '../components/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  useAdminParticipants,
  useAdminTeams,
  useApproveTeam,
  useRejectTeam,
} from '../hooks/useAdminDashboard'
import type { AdminParticipant } from '../types/participant'
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

const PAGE_SIZE = 20

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function Avatar({
  name,
  size = 'sm',
}: {
  name: string
  size?: 'sm' | 'lg'
}) {
  const cls =
    size === 'lg'
      ? 'w-16 h-16 rounded-xl text-2xl font-semibold'
      : 'w-8 h-8 rounded-full text-xs font-semibold'
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center bg-[#7132f5]/10 text-[#7132f5]`}
    >
      {getInitials(name)}
    </div>
  )
}

function ParticipantModal({
  participant,
  onClose,
}: {
  participant: AdminParticipant
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Banner */}
        <div className="relative h-20 bg-gradient-to-r from-[#7132f5]/10 to-transparent">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-[#9497a9] transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar sobrepondo o banner */}
        <div className="-mt-8 ml-6 border-4 border-white rounded-xl w-fit">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[#7132f5] text-white text-2xl font-semibold">
            {getInitials(participant.full_name)}
          </div>
        </div>

        <div className="px-6 pt-2 pb-1">
          <h2 className="font-display text-xl font-semibold text-[#101114]">
            {participant.full_name}
          </h2>
          <p className="text-sm text-[#9497a9]">{participant.email}</p>
        </div>

        {/* Corpo */}
        <div className="px-6 pb-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">Curso</p>
              <p className="text-sm font-medium text-[#101114]">{participant.course}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">Semestre</p>
              <p className="text-sm font-medium text-[#101114]">{participant.semester}º</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">Equipe</p>
              <p className="text-sm font-medium text-[#101114]">
                {participant.team_name ?? 'Sem equipe'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">Telefone</p>
              <p className="text-sm font-medium text-[#101114]">{participant.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">GitHub</p>
              {participant.github ? (
                <a
                  href={participant.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#7132f5] hover:underline"
                >
                  {participant.github.replace('https://github.com/', '@')}
                </a>
              ) : (
                <p className="text-sm text-[#9497a9]">—</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">LinkedIn</p>
              {participant.linkedin ? (
                <a
                  href={participant.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#7132f5] hover:underline"
                >
                  Ver perfil
                </a>
              ) : (
                <p className="text-sm text-[#9497a9]">—</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-[#9497a9]">Sobre</p>
            {participant.bio ? (
              <p className="mt-1 text-sm leading-relaxed text-[#686b82]">{participant.bio}</p>
            ) : (
              <p className="mt-1 text-sm italic text-[#9497a9]">Nenhuma bio cadastrada</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#dedee5] p-4">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}

function MemberCard({
  member,
  isLeader,
  onClick,
}: {
  member: { id: string; full_name: string; course: string; semester: number }
  isLeader: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg bg-[#f8f8fa] p-3 text-left transition-colors hover:bg-[#7132f5]/5 cursor-pointer"
    >
      <Avatar name={member.full_name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#101114]">{member.full_name}</p>
        <p className="truncate text-xs text-[#9497a9]">
          {member.course} · {member.semester}º sem
        </p>
      </div>
      {isLeader && (
        <span className="shrink-0 rounded-full bg-[#7132f5]/10 px-1.5 py-0.5 text-[10px] text-[#7132f5]">
          Líder
        </span>
      )}
    </button>
  )
}

function TeamsTab({
  statusFilter,
  setStatusFilter,
  onSelectParticipant,
}: {
  statusFilter: TeamStatus
  setStatusFilter: (s: TeamStatus) => void
  onSelectParticipant: (p: AdminParticipant) => void
}) {
  const teamsQuery = useAdminTeams(statusFilter)
  const approveMutation = useApproveTeam()
  const rejectMutation = useRejectTeam()
  const mutationError = approveMutation.error ?? rejectMutation.error
  const teams = teamsQuery.data ?? []

  const handleApprove = (team: Team) => {
    if (!window.confirm(`Aprovar a equipe ${team.name}?`)) return
    approveMutation.mutate(team.id)
  }
  const handleReject = (team: Team) => {
    if (!window.confirm(`Recusar a equipe ${team.name}?`)) return
    rejectMutation.mutate(team.id)
  }

  const handleMemberClick = (member: Team['members'][number]) => {
    const ap: AdminParticipant = {
      id: member.id,
      email: '',
      full_name: member.full_name,
      phone: null,
      course: member.course,
      semester: member.semester,
      bio: member.bio,
      github: member.github,
      linkedin: member.linkedin,
      has_team: true,
      team_name: null,
      created_at: '',
      updated_at: '',
    }
    onSelectParticipant(ap)
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#9497a9]">Filtrar por</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TeamStatus)}
            className="rounded-xl border border-[#dedee5] bg-white px-3 py-2 text-sm text-[#101114] focus:border-[#7132f5] focus:outline-none focus:ring-2 focus:ring-[#7132f5]/30"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mutationError && (
        <p className="mb-4 text-sm text-red-400">{getApiError(mutationError)}</p>
      )}
      {teamsQuery.isLoading && <p className="text-[#9497a9]">Carregando equipes...</p>}
      {teamsQuery.data && teams.length === 0 && (
        <p className="text-[#9497a9]">
          Nenhuma equipe com status "{STATUS_LABEL[statusFilter].toLowerCase()}".
        </p>
      )}

      <div className="space-y-4">
        {teams.map((team) => (
          <article key={team.id} className="glass-panel rounded-2xl p-6">
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#101114]">
                  {team.name}
                </h2>
                <p className="mt-1 text-sm text-[#9497a9]">
                  Líder: <span className="text-[#101114]">{team.leader.full_name}</span>
                  {' · '}
                  {team.member_count}/4 membros
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[team.status]}>{STATUS_LABEL[team.status]}</Badge>
            </header>

            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {team.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isLeader={member.id === team.leader.id}
                  onClick={() => handleMemberClick(member)}
                />
              ))}
            </div>

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
    </>
  )
}

function ParticipantsTab({
  onSelectParticipant,
}: {
  onSelectParticipant: (p: AdminParticipant) => void
}) {
  const participantsQuery = useAdminParticipants()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_team' | 'without_team'>('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const all = participantsQuery.data ?? []
    return all
      .filter((p) => {
        if (statusFilter === 'with_team') return p.has_team
        if (statusFilter === 'without_team') return !p.has_team
        return true
      })
      .filter((p) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.course.toLowerCase().includes(q)
        )
      })
  }, [participantsQuery.data, search, statusFilter])

  const allParticipants = participantsQuery.data ?? []
  const withTeam = allParticipants.filter((p) => p.has_team).length
  const withoutTeam = allParticipants.length - withTeam

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSearchChange = (v: string) => {
    setSearch(v)
    setPage(0)
  }
  const handleStatusFilterChange = (v: 'all' | 'with_team' | 'without_team') => {
    setStatusFilter(v)
    setPage(0)
  }

  if (participantsQuery.isLoading) {
    return <p className="text-[#9497a9]">Carregando participantes...</p>
  }

  return (
    <>
      {/* Barra de busca e filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9497a9]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nome, curso ou e-mail..."
            className="w-full rounded-xl border border-[#dedee5] bg-white py-2 pl-9 pr-4 text-sm text-[#101114] placeholder-[#9497a9] focus:border-[#7132f5] focus:outline-none focus:ring-2 focus:ring-[#7132f5]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            handleStatusFilterChange(e.target.value as 'all' | 'with_team' | 'without_team')
          }
          className="rounded-xl border border-[#dedee5] bg-white px-3 py-2 text-sm text-[#101114] focus:border-[#7132f5] focus:outline-none focus:ring-2 focus:ring-[#7132f5]/30"
        >
          <option value="all">Todos</option>
          <option value="with_team">Com equipe</option>
          <option value="without_team">Sem equipe</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-[#9497a9]">
        {filtered.length} participante{filtered.length !== 1 ? 's' : ''} · {withTeam} com equipe ·{' '}
        {withoutTeam} sem equipe
      </p>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-[#dedee5]">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f8f8fa]">
              {['Nome', 'E-mail', 'Curso', 'Semestre', 'Equipe', 'Ações'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9497a9]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectParticipant(p)}
                className="cursor-pointer border-b border-[#dedee5] transition-colors hover:bg-[#7132f5]/[0.02] last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name} />
                    <span className="font-medium text-[#101114] text-sm">{p.full_name}</span>
                    <div className="flex gap-1">
                      {p.github && (
                        <a
                          href={p.github}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#9497a9] transition-colors hover:text-[#7132f5]"
                          title="GitHub"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {p.linkedin && (
                        <a
                          href={p.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#9497a9] transition-colors hover:text-[#7132f5]"
                          title="LinkedIn"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#686b82]">{p.email}</td>
                <td className="px-4 py-3 text-sm text-[#686b82]">{p.course}</td>
                <td className="px-4 py-3 text-sm text-[#686b82]">{p.semester}º</td>
                <td className="px-4 py-3">
                  {p.team_name ? (
                    <span className="rounded-full bg-[#7132f5]/10 px-2 py-0.5 text-xs font-medium text-[#7132f5]">
                      {p.team_name}
                    </span>
                  ) : (
                    <span className="text-sm text-[#9497a9]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectParticipant(p)
                    }}
                    className="rounded-lg p-1.5 text-[#9497a9] transition-colors hover:bg-[#7132f5]/10 hover:text-[#7132f5]"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {paged.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectParticipant(p)}
            className="glass-panel w-full rounded-2xl p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <Avatar name={p.full_name} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#101114] text-sm">{p.full_name}</p>
                <p className="text-xs text-[#9497a9] truncate">{p.email}</p>
                <p className="text-xs text-[#9497a9]">
                  {p.course} · {p.semester}º sem
                </p>
                {p.team_name && (
                  <span className="mt-1 inline-block rounded-full bg-[#7132f5]/10 px-2 py-0.5 text-[10px] font-medium text-[#7132f5]">
                    {p.team_name}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Paginação */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[#9497a9]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de{' '}
            {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'teams' | 'participants'>('teams')
  const [statusFilter, setStatusFilter] = useState<TeamStatus>('submitted')
  const [selectedParticipant, setSelectedParticipant] = useState<AdminParticipant | null>(null)

  const approvedQuery = useAdminTeams('approved')
  const participantsQuery = useAdminParticipants()

  const approvedCount = approvedQuery.data?.length ?? 0
  const totalParticipants = participantsQuery.data?.length ?? 0
  const teamsCount = useAdminTeams(statusFilter).data?.length ?? 0

  return (
    <div className="min-h-screen app-shell text-ink">
      <Header admin />

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-2">Administração</p>
            <h1 className="font-display text-4xl">
              <span className="font-light">Painel do </span>
              <span className="font-semibold text-[#101114]">administrador</span>
            </h1>
            <p className="mt-2 text-sm text-[#9497a9]">
              {approvedCount}/10 equipes aprovadas · {totalParticipants} participantes cadastrados
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-8 border-b border-[#dedee5]">
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
              activeTab === 'teams'
                ? 'border-[#7132f5] font-medium text-[#7132f5]'
                : 'border-transparent text-[#9497a9] hover:text-[#101114]'
            }`}
          >
            Equipes
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === 'teams'
                  ? 'bg-[#7132f5]/10 text-[#7132f5]'
                  : 'bg-[#f0f0f4] text-[#9497a9]'
              }`}
            >
              {teamsCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
              activeTab === 'participants'
                ? 'border-[#7132f5] font-medium text-[#7132f5]'
                : 'border-transparent text-[#9497a9] hover:text-[#101114]'
            }`}
          >
            Participantes
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === 'participants'
                  ? 'bg-[#7132f5]/10 text-[#7132f5]'
                  : 'bg-[#f0f0f4] text-[#9497a9]'
              }`}
            >
              {totalParticipants}
            </span>
          </button>
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'teams' ? (
          <TeamsTab
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelectParticipant={setSelectedParticipant}
          />
        ) : (
          <ParticipantsTab onSelectParticipant={setSelectedParticipant} />
        )}
      </main>

      {selectedParticipant && (
        <ParticipantModal
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}
    </div>
  )
}
