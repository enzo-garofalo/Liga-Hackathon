import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { JoinRequestListItem } from '../components/JoinRequestListItem'
import { InviteMembersModal } from '../components/InviteMembersModal'
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
  forming:   'Em formação',
  submitted: 'Submetida',
  approved:  'Aprovada',
  rejected:  'Não selecionada',
}

const STATUS_CLASSES: Record<TeamStatus, string> = {
  forming:   'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
}

// Avatar colors: index 0 = leader (always purple-600), rest in ascending purple tones
const MEMBER_AVATAR_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-purple-200 text-purple-800',
  'bg-purple-300 text-purple-900',
  'bg-purple-500/20 text-purple-700',
]

function memberInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const meQuery = useMe()
  const teamQuery = useTeam(id)

  return (
    <main className="px-4 py-6 md:px-10 md:py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        {teamQuery.isLoading && (
          <p className="font-ui text-[#9497a9]">Carregando equipe...</p>
        )}
        {teamQuery.isError && (
          <p className="font-ui text-red-500">Equipe não encontrada.</p>
        )}
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

  const updateMutation    = useUpdateTeam(id)
  const submitMutation    = useSubmitTeam(id)
  const leaveMutation     = useLeaveTeam(id)
  const removeMutation    = useRemoveMember(id)
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

  // Leader only leaves if there's more than 1 member
  const canLeave = (isLeader || isMember) && canMutate

  return (
    <>
      {/* Header */}
      <div>
        <p className="text-xs text-[#9497a9] font-ui uppercase tracking-widest mb-2">Equipes</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-3xl font-bold text-[#101114]">{team.name}</h1>
          <span className={[
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-ui',
            STATUS_CLASSES[team.status],
          ].join(' ')}>
            {STATUS_LABEL[team.status]}
          </span>
        </div>
        <p className="text-sm text-[#9497a9] font-ui mt-1">
          {team.member_count}/4 membros · {team.is_open ? 'Aberta' : 'Fechada'}
        </p>
      </div>

      {/* Leader action buttons */}
      {isLeader && canMutate && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => setInviteModalOpen(true)}>
            Convidar membro
          </Button>
          <Button
            variant="outlined"
            onClick={handleToggleOpen}
            loading={updateMutation.isPending}
          >
            {team.is_open ? 'Fechar para pedidos' : 'Abrir para pedidos'}
          </Button>
          {team.member_count === 4 && (
            <Button variant="primary" onClick={handleSubmit} loading={submitMutation.isPending}>
              Submeter para análise
            </Button>
          )}
        </div>
      )}

      {!isLeader && isMember && canMutate && team.member_count === 4 && (
        <p className="text-sm text-[#9497a9] font-ui">
          Apenas o líder da equipe pode submeter para análise.
        </p>
      )}

      {/* Visitor join request */}
      {canRequestJoin && (
        <div>
          {requestSent ? (
            <p className="font-ui text-green-600 text-sm">
              Pedido enviado. Aguarde a resposta do líder.
            </p>
          ) : (
            <Button
              variant="primary"
              onClick={handleJoinRequest}
              loading={joinRequestMutation.isPending}
            >
              Solicitar entrada
            </Button>
          )}
        </div>
      )}

      {/* Members card */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-display text-base font-semibold text-[#101114] mb-4">Membros</h2>
        <ul className="divide-y divide-gray-100">
          {team.members.map((m, i) => (
            <MemberRow
              key={m.id}
              member={m}
              index={i}
              isLeader={m.id === team.leader.id}
              canRemove={isLeader && canMutate && m.id !== team.leader.id}
              onRemove={() => handleRemove(m.id, m.full_name)}
              removing={removeMutation.isPending && removeMutation.variables === m.id}
            />
          ))}
        </ul>
      </section>

      {/* Pending join requests (leader only) */}
      {isLeader && canMutate && pendingRequests.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-display text-base font-semibold text-[#101114] mb-4">
            Pedidos de entrada
          </h2>
          <ul className="divide-y divide-gray-100">
            {pendingRequests.map((req) => (
              <JoinRequestListItem key={req.id} request={req} teamId={id} />
            ))}
          </ul>
        </section>
      )}

      {mutationError && (
        <p className="text-sm text-red-500 font-ui">{getApiError(mutationError)}</p>
      )}

      {canLeave && (
        <div className="mt-6 flex justify-start">
          <button
            onClick={handleLeave}
            disabled={leaveMutation.isPending}
            className={[
              'group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-ui font-medium',
              'text-red-500 border border-red-200 bg-red-50/50',
              'hover:bg-red-50 hover:border-red-300 hover:text-red-600',
              'transition-all duration-150',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            <svg
              className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {leaveMutation.isPending ? 'Saindo...' : 'Sair da equipe'}
          </button>
        </div>
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
  index: number
  isLeader: boolean
  canRemove: boolean
  onRemove: () => void
  removing: boolean
}

function MemberRow({ member, index, isLeader, canRemove, onRemove, removing }: MemberRowProps) {
  const avatarClasses = isLeader
    ? 'bg-purple-600 text-white'
    : MEMBER_AVATAR_COLORS[(index - 1) % MEMBER_AVATAR_COLORS.length]

  return (
    <li className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-100">
      {/* Avatar */}
      <div className={[
        'w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center',
        avatarClasses,
      ].join(' ')}>
        <span className="text-sm font-semibold font-display">
          {memberInitials(member.full_name)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-ui font-medium text-[#101114] truncate">{member.full_name}</p>
          {isLeader && (
            <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full font-ui">
              Líder
            </span>
          )}
        </div>
        <p className="text-xs text-[#9497a9] font-ui mt-0.5">
          {member.course} · {member.semester}º semestre
        </p>
        {(member.github || member.linkedin) && (
          <p className="text-xs text-[#9497a9] font-ui mt-0.5 flex gap-3">
            {member.github && (
              <a href={member.github} target="_blank" rel="noreferrer" className="hover:text-[#7132f5] transition-colors">
                GitHub
              </a>
            )}
            {member.linkedin && (
              <a href={member.linkedin} target="_blank" rel="noreferrer" className="hover:text-[#7132f5] transition-colors">
                LinkedIn
              </a>
            )}
          </p>
        )}
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="flex-shrink-0 p-1.5 rounded-lg text-[#9497a9] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          title={`Remover ${member.full_name}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  )
}
