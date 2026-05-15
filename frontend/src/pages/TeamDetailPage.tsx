import { Link, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useMe } from '../hooks/useAuth'
import {
  useLeaveTeam,
  useRemoveMember,
  useSubmitTeam,
  useTeam,
  useUpdateTeam,
} from '../hooks/useTeam'
import type { ParticipantSummary } from '../types/participant'
import type { Team, TeamStatus } from '../types/team'
import { getApiError } from '../utils/errors'

const STATUS_LABEL: Record<TeamStatus, string> = {
  forming: 'Em formação',
  submitted: 'Submetida',
  approved: 'Aprovada',
  rejected: 'Não selecionada',
}

const STATUS_VARIANT: Record<TeamStatus, 'success' | 'neutral' | 'pending'> = {
  forming: 'pending',
  submitted: 'pending',
  approved: 'success',
  rejected: 'neutral',
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const meQuery = useMe()
  const teamQuery = useTeam(id)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={meQuery.data} />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {teamQuery.isLoading && (
          <p className="font-ui text-silver-blue">Carregando equipe...</p>
        )}
        {teamQuery.isError && (
          <p className="font-ui text-red-500">Equipe não encontrada.</p>
        )}
        {teamQuery.data && id && (
          <TeamDetail
            team={teamQuery.data}
            id={id}
            meId={meQuery.data?.id ?? null}
          />
        )}
      </main>
    </div>
  )
}

interface TeamDetailProps {
  team: Team
  id: string
  meId: string | null
}

function TeamDetail({ team, id, meId }: TeamDetailProps) {
  const navigate = useNavigate()
  const isLeader = meId !== null && team.leader.id === meId
  const isMember = meId !== null && team.members.some((m) => m.id === meId)
  const canMutate = team.status === 'forming'

  const updateMutation = useUpdateTeam(id)
  const submitMutation = useSubmitTeam(id)
  const leaveMutation = useLeaveTeam(id)
  const removeMutation = useRemoveMember(id)

  const handleToggleOpen = () => updateMutation.mutate({ is_open: !team.is_open })
  const handleSubmit = () => {
    if (!window.confirm('Submeter a equipe? Após submeter, ninguém pode mais entrar ou sair.')) return
    submitMutation.mutate()
  }
  const handleLeave = () => {
    if (!window.confirm('Tem certeza que deseja sair da equipe?')) return
    leaveMutation.mutate(undefined, { onSuccess: () => navigate('/dashboard') })
  }
  const handleRemove = (participantId: string, name: string) => {
    if (!window.confirm(`Remover ${name} da equipe?`)) return
    removeMutation.mutate(participantId)
  }

  const mutationError =
    updateMutation.error ?? submitMutation.error ?? leaveMutation.error ?? removeMutation.error

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-near-black mb-1">
            {team.name}
          </h1>
          <p className="text-sm text-silver-blue font-ui">
            {team.member_count}/4 membros · {team.is_open ? 'Aberta' : 'Fechada'}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[team.status]}>{STATUS_LABEL[team.status]}</Badge>
      </header>

      {isLeader && canMutate && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outlined"
            onClick={handleToggleOpen}
            loading={updateMutation.isPending}
          >
            {team.is_open ? 'Fechar para pedidos' : 'Abrir para pedidos'}
          </Button>
          <Link to={`/teams/${team.id}/invites`}>
            <Button variant="outlined">Convidar membro</Button>
          </Link>
          {team.member_count === 4 && (
            <Button variant="primary" onClick={handleSubmit} loading={submitMutation.isPending}>
              Submeter para análise
            </Button>
          )}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-6">
        <h2 className="font-display text-lg font-semibold text-near-black mb-4">
          Membros
        </h2>
        <ul className="divide-y divide-[#dedee5]">
          {team.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isLeader={m.id === team.leader.id}
              canRemove={isLeader && canMutate && m.id !== team.leader.id}
              onRemove={() => handleRemove(m.id, m.full_name)}
              removing={removeMutation.isPending && removeMutation.variables === m.id}
            />
          ))}
        </ul>
      </section>

      {isMember && canMutate && (
        <Button variant="ghost" onClick={handleLeave} loading={leaveMutation.isPending}>
          Sair da equipe
        </Button>
      )}

      {mutationError && (
        <p className="text-sm text-red-500 font-ui">{getApiError(mutationError)}</p>
      )}
    </>
  )
}

interface MemberRowProps {
  member: ParticipantSummary
  isLeader: boolean
  canRemove: boolean
  onRemove: () => void
  removing: boolean
}

function MemberRow({ member, isLeader, canRemove, onRemove, removing }: MemberRowProps) {
  return (
    <li className="py-4 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-ui font-medium text-near-black">{member.full_name}</p>
          {isLeader && <Badge variant="pending">Líder</Badge>}
        </div>
        <p className="text-xs text-silver-blue font-ui mt-1">
          {member.course} · {member.semester}º semestre
        </p>
        {(member.github || member.linkedin) && (
          <p className="text-xs text-silver-blue font-ui mt-1 flex gap-3">
            {member.github && (
              <a href={member.github} target="_blank" rel="noreferrer" className="hover:text-brand">
                GitHub
              </a>
            )}
            {member.linkedin && (
              <a href={member.linkedin} target="_blank" rel="noreferrer" className="hover:text-brand">
                LinkedIn
              </a>
            )}
          </p>
        )}
      </div>
      {canRemove && (
        <Button variant="ghost" onClick={onRemove} loading={removing}>
          Remover
        </Button>
      )}
    </li>
  )
}
