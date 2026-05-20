import { X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InviteMembersModal } from '../components/InviteMembersModal'
import { JoinRequestListItem } from '../components/JoinRequestListItem'
import { Button } from '../components/ui/Button'
import { useMe } from '../hooks/useAuth'
import { useCreateJoinRequest, useTeamJoinRequests } from '../hooks/useJoinRequests'
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

function memberInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const meQuery = useMe()
  const teamQuery = useTeam(id)

  return (
    <main className="px-4 py-6 text-ink md:px-10 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {teamQuery.isLoading && <p className="text-ink/46">Carregando equipe...</p>}
        {teamQuery.isError && <p className="text-red-500">Equipe não encontrada.</p>}
        {teamQuery.data && id && (
          <TeamDetail
            team={teamQuery.data}
            id={id}
            meId={meQuery.data?.id ?? null}
            meHasTeam={meQuery.data?.has_team ?? false}
          />
        )}
      </div>
    </main>
  )
}

interface TeamDetailProps {
  team: Team
  id: string
  meId: string | null
  meHasTeam: boolean
}

function TeamDetail({ team, id, meId, meHasTeam }: TeamDetailProps) {
  const navigate = useNavigate()
  const isLeader = meId !== null && team.leader.id === meId
  const isMember = meId !== null && team.members.some((m) => m.id === meId)
  const isVisitor = meId !== null && !isMember
  const canMutate = team.status === 'forming'

  const updateMutation = useUpdateTeam(id)
  const submitMutation = useSubmitTeam(id)
  const leaveMutation = useLeaveTeam(id)
  const removeMutation = useRemoveMember(id)
  const joinRequestMutation = useCreateJoinRequest()
  const joinRequestsQuery = useTeamJoinRequests(isLeader && canMutate ? id : undefined)
  const [requestSent, setRequestSent] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

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
  const handleJoinRequest = () => {
    joinRequestMutation.mutate(id, { onSuccess: () => setRequestSent(true) })
  }

  const mutationError =
    updateMutation.error ??
    submitMutation.error ??
    leaveMutation.error ??
    removeMutation.error ??
    joinRequestMutation.error

  const canRequestJoin =
    isVisitor && !meHasTeam && team.is_open && team.status === 'forming' && team.member_count < 4
  const pendingRequests = joinRequestsQuery.data ?? []
  const canLeave = (isLeader || isMember) && canMutate

  return (
    <>
      <section className="glass-panel relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="purple-beam-soft opacity-40" />
        <div className="relative">
          <p className="kicker mb-2">Equipe</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-bold text-ink">{team.name}</h1>
            <span className="rounded-full border border-brand/25 bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand-soft">
              {STATUS_LABEL[team.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink/50">
            {team.member_count}/4 membros - {team.is_open ? 'Aberta' : 'Fechada'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isLeader && canMutate && (
              <>
                <Button onClick={() => setInviteModalOpen(true)}>Convidar membro</Button>
                <Button variant="outlined" onClick={handleToggleOpen} loading={updateMutation.isPending}>
                  {team.is_open ? 'Fechar para pedidos' : 'Abrir para pedidos'}
                </Button>
                {team.member_count === 4 && (
                  <Button onClick={handleSubmit} loading={submitMutation.isPending}>
                    Submeter para análise
                  </Button>
                )}
              </>
            )}

            {canRequestJoin && (
              requestSent ? (
                <p className="text-sm text-green-700">Pedido enviado. Aguarde a resposta do líder.</p>
              ) : (
                <Button onClick={handleJoinRequest} loading={joinRequestMutation.isPending}>
                  Solicitar entrada
                </Button>
              )
            )}
          </div>
        </div>
      </section>

      {!isLeader && isMember && canMutate && team.member_count === 4 && (
        <p className="text-sm text-ink/50">Apenas o líder da equipe pode submeter para análise.</p>
      )}

      <section className="glass-panel rounded-2xl p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Membros</h2>
        <ul className="divide-y divide-ink/10">
          {team.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isLeader={member.id === team.leader.id}
              canRemove={isLeader && canMutate && member.id !== team.leader.id}
              onRemove={() => handleRemove(member.id, member.full_name)}
              removing={removeMutation.isPending && removeMutation.variables === member.id}
            />
          ))}
        </ul>
      </section>

      {isLeader && canMutate && pendingRequests.length > 0 && (
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-ink">Pedidos de entrada</h2>
          <ul className="divide-y divide-ink/10">
            {pendingRequests.map((request) => (
              <JoinRequestListItem key={request.id} request={request} teamId={id} />
            ))}
          </ul>
        </section>
      )}

      {mutationError && <p className="text-sm text-red-400">{getApiError(mutationError)}</p>}

      {canLeave && (
        <button
          onClick={handleLeave}
          disabled={leaveMutation.isPending}
          className="rounded-xl border border-red-700/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {leaveMutation.isPending ? 'Saindo...' : 'Sair da equipe'}
        </button>
      )}

      {inviteModalOpen && meId && (
        <InviteMembersModal
          teamId={team.id}
          maxInvitees={4 - team.member_count}
          meId={meId}
          onClose={() => setInviteModalOpen(false)}
        />
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
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${isLeader ? 'bg-brand text-white' : 'bg-ink/10 text-ink'}`}>
        <span className="font-display text-sm font-semibold">{memberInitials(member.full_name)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-ink">{member.full_name}</p>
          {isLeader && (
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-soft">
              Líder
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink/46">
          {member.course} - {member.semester} semestre
        </p>
        {(member.github || member.linkedin) && (
          <p className="mt-0.5 flex gap-3 text-xs text-ink/46">
            {member.github && (
              <a href={member.github} target="_blank" rel="noreferrer" className="hover:text-brand-soft">
                GitHub
              </a>
            )}
            {member.linkedin && (
              <a href={member.linkedin} target="_blank" rel="noreferrer" className="hover:text-brand-soft">
                LinkedIn
              </a>
            )}
          </p>
        )}
      </div>

      {canRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="flex-shrink-0 rounded-lg p-1.5 text-ink/42 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
          title={`Remover ${member.full_name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  )
}
