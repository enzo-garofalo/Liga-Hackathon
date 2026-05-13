import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import type { ActionType, PendingAction } from '../hooks/useAdminDashboard'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import type { Participant, Team, TeamStatus } from '../types'
import { getApiError } from '../utils/errors'

const STATUS_BADGE: Record<TeamStatus, { variant: 'success' | 'neutral' | 'pending'; label: string }> =
  {
    approved: { variant: 'success', label: 'Aprovada' },
    rejected: { variant: 'neutral', label: 'Recusada' },
    pending: { variant: 'pending', label: 'Pendente' },
  }

const FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovadas' },
  { value: 'rejected', label: 'Recusadas' },
]

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null)
  const {
    teams,
    isLoading,
    approvedCount,
    statusFilter,
    setStatusFilter,
    pendingAction,
    setPendingAction,
    confirmAction,
    isMutating,
    mutationError,
  } = useAdminDashboard()

  const handleLogout = () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-[#dedee5] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Liga de TI" className="h-7" />
            <span className="font-display font-semibold text-near-black">Liga de TI</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-ui text-silver-blue">
              <span className={approvedCount >= 10 ? 'text-red-500 font-semibold' : 'text-near-black font-semibold'}>
                {approvedCount}
              </span>
              {' '}de 10 vagas preenchidas
            </span>
            <Button variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-near-black mb-8">
          Equipes inscritas
        </h1>

        <div className="flex gap-2 mb-6">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={[
                'px-4 py-1.5 rounded-xl text-sm font-medium font-ui transition-colors',
                statusFilter === value
                  ? 'bg-brand text-white'
                  : 'bg-white text-silver-blue border border-[#dedee5] hover:text-near-black',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper overflow-hidden">
          {isLoading ? (
            <p className="p-12 text-center text-silver-blue font-ui text-sm">Carregando...</p>
          ) : teams.length === 0 ? (
            <p className="p-12 text-center text-silver-blue font-ui text-sm">
              Nenhuma equipe encontrada.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dedee5] bg-gray-50/60">
                  {['Equipe', 'Projeto', 'Líder', 'Status', 'Data', 'Ações'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 font-ui font-medium text-silver-blue text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dedee5]">
                {teams.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    onView={() => setViewingTeam(team)}
                    onAction={(action) => setPendingAction({ team, action })}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewingTeam && (
        <TeamDetailModal team={viewingTeam} onClose={() => setViewingTeam(null)} />
      )}

      {pendingAction && (
        <ConfirmModal
          pendingAction={pendingAction}
          isMutating={isMutating}
          error={mutationError}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}

function TeamRow({
  team,
  onView,
  onAction,
}: {
  team: Team
  onView: () => void
  onAction: (a: ActionType) => void
}) {
  const leader = team.participants.find((p) => p.is_leader)
  const badge = STATUS_BADGE[team.status]
  const date = new Date(team.created_at).toLocaleDateString('pt-BR')

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 font-ui font-medium text-near-black">{team.name}</td>
      <td className="px-6 py-4 font-ui text-silver-blue">{team.title}</td>
      <td className="px-6 py-4 font-ui text-near-black">{leader?.full_name ?? '—'}</td>
      <td className="px-6 py-4">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </td>
      <td className="px-6 py-4 font-ui text-silver-blue">{date}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            title="Ver detalhes"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-silver-blue hover:text-brand hover:bg-brand/5 transition-colors"
          >
            <IconEye />
          </button>
          {team.status === 'pending' && (
            <>
              <Button variant="subtle" onClick={() => onAction('approve')}>
                Aprovar
              </Button>
              <Button variant="ghost" onClick={() => onAction('reject')}>
                Recusar
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

function TeamDetailModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const badge = STATUS_BADGE[team.status]

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl border border-[#dedee5] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6 border-b border-[#dedee5]">
          <div>
            <h3 className="font-display text-xl font-semibold text-near-black">{team.name}</h3>
            <p className="text-sm text-silver-blue font-ui mt-0.5">{team.title}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-silver-blue hover:text-near-black hover:bg-gray-100 transition-colors"
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 py-6 space-y-7">
          {/* Proposal */}
          <div>
            <p className="text-xs font-ui font-medium text-silver-blue uppercase tracking-wide mb-2">
              Proposta
            </p>
            <p className="text-sm font-ui text-near-black leading-relaxed">{team.proposal}</p>
          </div>

          {/* Participants */}
          <div>
            <p className="text-xs font-ui font-medium text-silver-blue uppercase tracking-wide mb-3">
              Participantes
            </p>
            <div className="space-y-3">
              {team.participants.map((p) => (
                <ParticipantCard key={p.id} participant={p} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#dedee5]">
          <p className="text-xs font-ui text-silver-blue font-mono truncate">ID: {team.id}</p>
        </div>
      </div>
    </div>
  )
}

function ParticipantCard({ participant: p }: { participant: Participant }) {
  return (
    <div
      className={[
        'rounded-xl border border-[#dedee5] px-5 py-4',
        p.is_leader ? 'border-l-4 border-l-[#7132f5]' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-ui font-medium text-near-black text-sm">{p.full_name}</span>
        {p.is_leader && <Badge variant="pending">Líder</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <ParticipantField label="E-mail" value={p.email} />
        <ParticipantField label="Telefone" value={p.phone} />
        <ParticipantField label="RA" value={p.ra} />
        {p.github && (
          <div className="col-span-2">
            <dt className="text-xs text-silver-blue font-ui uppercase tracking-wide">GitHub</dt>
            <dd>
              <a
                href={p.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand font-ui hover:underline truncate block"
              >
                {p.github}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function ParticipantField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-silver-blue font-ui uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-[#101114] font-medium font-ui mt-0.5">{value}</dd>
    </div>
  )
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function ConfirmModal({
  pendingAction,
  isMutating,
  error,
  onConfirm,
  onCancel,
}: {
  pendingAction: PendingAction
  isMutating: boolean
  error: Error | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const isApprove = pendingAction.action === 'approve'

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl border border-[#dedee5] shadow-lg p-8 w-full max-w-sm space-y-5">
        <h3 className="font-display text-lg font-semibold text-near-black">
          {isApprove ? 'Aprovar equipe' : 'Recusar equipe'}
        </h3>
        <p className="text-sm font-ui text-silver-blue leading-relaxed">
          Tem certeza que deseja {isApprove ? 'aprovar' : 'recusar'} a equipe{' '}
          <span className="font-medium text-near-black">{pendingAction.team.name}</span>? Um e-mail
          será enviado para todos os participantes.
        </p>

        {error && <p className="text-sm text-red-500 font-ui">{getApiError(error)}</p>}

        <div className="flex gap-3 justify-end">
          <Button variant="outlined" onClick={onCancel} disabled={isMutating}>
            Cancelar
          </Button>
          <Button
            variant={isApprove ? 'primary' : 'subtle'}
            onClick={onConfirm}
            loading={isMutating}
          >
            {isApprove ? 'Confirmar aprovação' : 'Confirmar recusa'}
          </Button>
        </div>
      </div>
    </div>
  )
}
