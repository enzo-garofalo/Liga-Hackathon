import { X } from 'lucide-react'
import { useState } from 'react'
import { useCreateJoinRequest } from '../hooks/useJoinRequests'
import type { Team, TeamStatus } from '../types/team'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'

const STATUS_LABEL: Record<TeamStatus, string> = {
  forming: 'Em formação',
  submitted: 'Submetida',
  approved: 'Aprovada',
  rejected: 'Não selecionada',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

interface Props {
  team: Team
  meId: string | null
  meHasTeam: boolean
  onClose: () => void
}

export function TeamPreviewModal({ team, meId, meHasTeam, onClose }: Props) {
  const members = team.members ?? []
  const memberCount = team.member_count ?? members.length
  const isLeader = meId !== null && team.leader.id === meId
  const isMember = meId !== null && members.some((m) => m.id === meId)
  const canJoin = !isLeader && !isMember && !meHasTeam && team.is_open && memberCount < 4

  const [requestSent, setRequestSent] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const joinMutation = useCreateJoinRequest()

  function handleJoin() {
    joinMutation.mutate(team.id, {
      onSuccess: () => setRequestSent(true),
      onError: (err) => {
        const msg = getApiError(err).toLowerCase()
        if (msg.includes('pendente') || msg.includes('já enviou') || msg.includes('ja enviou') || msg.includes('already')) {
          setHasPendingRequest(true)
        }
      },
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="glass-panel pointer-events-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl p-6">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-bold text-ink">{team.name}</h2>
              <span className="rounded-full border border-brand/25 bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand-soft">
                {STATUS_LABEL[team.status]}
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-1.5 text-ink/46 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 text-sm text-ink/46">
            {memberCount}/4 membros - {team.is_open ? 'Aberta' : 'Fechada'}
          </p>

          <div className="flex-1 overflow-y-auto">
            <p className="kicker mb-3">Membros</p>
            <ul>
              {members.map((member) => {
                const leader = member.id === team.leader.id
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-ink/10"
                  >
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${leader ? 'bg-brand text-white' : 'bg-ink/10 text-ink'}`}>
                      <span className="font-display text-xs font-semibold">{initials(member.full_name)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{member.full_name}</p>
                        {leader && (
                          <span className="flex-shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-soft">
                            Líder
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-ink/46">
                        {member.course} - {member.semester} semestre
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="mt-5 space-y-2 border-t border-ink/10 pt-5">
            {requestSent && (
              <div className="rounded-xl border border-brand/25 bg-brand/15 px-4 py-2 text-center text-sm text-brand-soft">
                Pedido enviado!
              </div>
            )}

            {hasPendingRequest && (
              <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
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
              <p className="text-center text-sm text-red-400">{getApiError(joinMutation.error)}</p>
            )}

            {(isMember || isLeader) && (
              <div className="rounded-xl border border-brand/20 bg-brand/10 px-4 py-2.5 text-center text-sm text-brand-soft">
                Você já faz parte desta equipe
              </div>
            )}

            {meHasTeam && !isMember && !isLeader && (
              <div className="rounded-xl border border-ink/10 bg-ink/[0.06] px-4 py-2.5 text-center text-sm text-ink/56">
                Você já está em uma equipe
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-ink/[0.06] py-2.5 text-sm font-medium text-ink/62 transition-all hover:bg-ink/10 hover:text-ink"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
