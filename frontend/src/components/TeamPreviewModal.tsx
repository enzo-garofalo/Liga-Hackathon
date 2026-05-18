import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/Button'
import { useCreateJoinRequest } from '../hooks/useJoinRequests'
import { getApiError } from '../utils/errors'
import type { Team, TeamStatus } from '../types/team'

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

const MEMBER_AVATAR_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-purple-200 text-purple-800',
  'bg-purple-300 text-purple-900',
  'bg-purple-500/20 text-purple-700',
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

interface Props {
  team: Team
  meId: string | null
  meHasTeam: boolean
  onClose: () => void
}

export function TeamPreviewModal({ team, meId, meHasTeam, onClose }: Props) {
  const isLeader = meId !== null && team.leader.id === meId
  const isMember = meId !== null && team.members.some(m => m.id === meId)
  const canJoin = !isLeader && !isMember && !meHasTeam && team.is_open && team.member_count < 4

  const [requestSent, setRequestSent] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const joinMutation = useCreateJoinRequest()

  function handleJoin() {
    joinMutation.mutate(team.id, {
      onSuccess: () => setRequestSent(true),
      onError: (err) => {
        const msg = getApiError(err).toLowerCase()
        if (msg.includes('pendente') || msg.includes('já enviou') || msg.includes('already')) {
          setHasPendingRequest(true)
        }
      },
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
        <div className="max-w-lg w-full rounded-2xl bg-white shadow-2xl p-6 pointer-events-auto max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display font-bold text-xl text-[#101114]">{team.name}</h2>
              <span className={[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-ui',
                STATUS_CLASSES[team.status],
              ].join(' ')}>
                {STATUS_LABEL[team.status]}
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg text-[#9497a9] hover:text-[#101114] hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-[#9497a9] font-ui mb-5">
            {team.member_count}/4 membros · {team.is_open ? 'Aberta' : 'Fechada'}
          </p>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-xs font-ui font-medium text-[#9497a9] uppercase tracking-wider mb-3">Membros</p>
            <ul>
              {team.members.map((m, i) => {
                const avatarClasses = m.id === team.leader.id
                  ? 'bg-purple-600 text-white'
                  : MEMBER_AVATAR_COLORS[(i - 1) % MEMBER_AVATAR_COLORS.length]
                return (
                  <li
                    key={m.id}
                    className="py-3 flex items-center gap-3 first:pt-0 last:pb-0 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-100"
                  >
                    <div className={[
                      'w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center',
                      avatarClasses,
                    ].join(' ')}>
                      <span className="text-xs font-semibold font-display">{initials(m.full_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-ui font-medium text-sm text-[#101114] truncate">{m.full_name}</p>
                        {m.id === team.leader.id && (
                          <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full font-ui flex-shrink-0">
                            Líder
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9497a9] font-ui mt-0.5">
                        {m.course} · {m.semester}º semestre
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
            {requestSent && (
              <div className="bg-purple-50 border border-purple-200 text-purple-700 rounded-xl px-4 py-2 text-sm font-ui text-center">
                Pedido enviado!
              </div>
            )}

            {hasPendingRequest && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2 text-sm font-ui">
                Você já enviou um pedido pendente para esta equipe.
              </div>
            )}

            {canJoin && !requestSent && (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleJoin}
                loading={joinMutation.isPending}
                disabled={hasPendingRequest}
              >
                Solicitar entrada
              </Button>
            )}

            {!hasPendingRequest && joinMutation.error && !requestSent && (
              <p className="text-sm text-red-500 font-ui text-center">{getApiError(joinMutation.error)}</p>
            )}

            {(isMember || isLeader) && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 text-sm font-ui text-purple-700 text-center">
                Você já faz parte desta equipe
              </div>
            )}

            {meHasTeam && !isMember && !isLeader && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-ui text-[#686b82] text-center">
                Você já está em uma equipe
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-ui font-medium text-[#686b82] bg-gray-50 hover:bg-gray-100 hover:text-[#101114] transition-all"
            >
              Fechar
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
