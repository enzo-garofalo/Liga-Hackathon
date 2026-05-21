import { LogOut, Send, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeaveTeam, useSubmitTeam, useTeam } from '../hooks/useTeam'
import type { MeProfile } from '../types/participant'
import type { TeamMinimal } from '../types/team'
import { InviteMembersModal } from './InviteMembersModal'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface StatusBannerProps {
  me: MeProfile
}

export function StatusBanner({ me }: StatusBannerProps) {
  if (!me.team) return <NoTeamBanner />

  switch (me.team.status) {
    case 'forming':
      return <FormingBanner me={me} team={me.team} />
    case 'submitted':
      return <SubmittedBanner team={me.team} />
    case 'approved':
      return <ApprovedBanner team={me.team} />
    case 'rejected':
      return <RejectedBanner team={me.team} />
  }
}

function NoTeamBanner() {
  return (
    <Section>
      <h2 className="font-display text-2xl font-semibold text-ink">Você ainda não está em uma equipe</h2>
      <p className="mb-6 mt-2 text-sm text-ink/70">
        Crie a sua ou explore equipes abertas que estão procurando membros.
      </p>
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <Link
          to="/teams"
          className="inline-flex items-center justify-center rounded-2xl bg-brand px-5 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-[#5f28d4]"
        >
          Criar equipe
        </Link>
        <Link
          to="/teams"
          className="inline-flex items-center justify-center rounded-2xl border border-ink/20 px-5 py-2.5 font-ui text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
        >
          Explorar equipes abertas
        </Link>
      </div>
    </Section>
  )
}

function FormingBanner({ me, team }: { me: MeProfile; team: TeamMinimal }) {
  const navigate = useNavigate()
  const teamQuery = useTeam(team.id)
  const submit = useSubmitTeam(team.id)
  const leave = useLeaveTeam(team.id)
  const [inviteOpen, setInviteOpen] = useState(false)

  const fullTeam = teamQuery.data
  const isLeader = fullTeam ? fullTeam.leader.id === me.id : false
  const canSubmit = team.member_count === 4
  const remainingSlots = Math.max(0, 4 - team.member_count)

  const handleSubmit = () => {
    if (!window.confirm('Submeter a equipe? Após submeter, ninguém pode mais entrar ou sair.')) return
    submit.mutate(undefined, { onSuccess: () => navigate(`/teams/${team.id}`) })
  }

  const handleLeave = () => {
    if (!window.confirm('Tem certeza que deseja sair da equipe?')) return
    leave.mutate(undefined, { onSuccess: () => navigate('/dashboard') })
  }

  return (
    <Section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words font-display text-2xl font-semibold text-ink">{team.name}</h2>
          <p className="mt-2 text-sm font-medium text-ink/70">
            {team.member_count}/4 membros - {team.is_open ? 'Aceitando pedidos' : 'Fechada'}
          </p>
        </div>
        <Badge variant="pending">Em formação</Badge>
      </div>

      {isLeader && remainingSlots > 0 && (
        <div className="mb-5 rounded-2xl border border-brand/20 bg-brand/[0.07] px-4 py-3">
          <p className="text-sm font-medium text-ink">Ainda faltam {remainingSlots} membro{remainingSlots > 1 ? 's' : ''}.</p>
          <p className="mt-1 text-xs font-medium text-ink/68">Convide participantes agora para completar a equipe antes do prazo.</p>
        </div>
      )}

      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        <Link
          to={`/teams/${team.id}`}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink/20 px-5 font-ui text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
        >
          Ver equipe
        </Link>
        {isLeader && (
          <Button
            variant="primary"
            onClick={() => setInviteOpen(true)}
            className="h-11 w-full px-6 text-base shadow-[0_16px_36px_rgba(113,50,245,0.22)] sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Convidar membro
          </Button>
        )}
        {isLeader && canSubmit && (
          <Button variant="primary" onClick={handleSubmit} loading={submit.isPending} className="h-11 w-full sm:w-auto">
            <Send className="h-4 w-4" />
            Submeter para análise
          </Button>
        )}
        <button
          onClick={handleLeave}
          disabled={leave.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-700/25 bg-red-500/10 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto"
        >
          <LogOut className="h-4 w-4" />
          {leave.isPending ? 'Saindo...' : 'Sair da equipe'}
        </button>
      </div>

      {!canSubmit && (
        <p className="mt-4 text-sm text-ink/52">
          A equipe precisa ter 4 membros para ser submetida.
        </p>
      )}

      {inviteOpen && (
        <InviteMembersModal
          teamId={team.id}
          maxInvitees={4 - team.member_count}
          meId={me.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </Section>
  )
}

function SubmittedBanner({ team }: { team: TeamMinimal }) {
  return (
    <Section>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">{team.name}</h2>
        <Badge variant="pending">Submetida</Badge>
      </div>
      <p className="mb-6 text-sm text-ink/70">
        Equipe submetida para análise. Aguardem o resultado por e-mail.
      </p>
      <Link
        to={`/teams/${team.id}`}
        className="inline-flex items-center justify-center rounded-2xl border border-ink/20 px-5 py-2.5 font-ui text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
      >
        Ver equipe
      </Link>
    </Section>
  )
}

function ApprovedBanner({ team }: { team: TeamMinimal }) {
  return (
    <Section tone="success">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">{team.name}</h2>
        <Badge variant="success">Aprovada</Badge>
      </div>
      <p className="mb-6 text-sm text-ink/72">
        Parabéns! A equipe foi selecionada para o Hackathon.
      </p>
      <Link
        to={`/teams/${team.id}`}
        className="inline-flex items-center justify-center rounded-2xl bg-brand px-5 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-[#5f28d4]"
      >
        Ver equipe
      </Link>
    </Section>
  )
}

function RejectedBanner({ team }: { team: TeamMinimal }) {
  return (
    <Section>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">{team.name}</h2>
        <Badge variant="neutral">Não selecionada</Badge>
      </div>
      <p className="mb-6 text-sm text-ink/70">
        A equipe não foi selecionada nesta edição. Esperamos vocês nas próximas.
      </p>
      <Link
        to={`/teams/${team.id}`}
        className="inline-flex items-center justify-center rounded-2xl border border-ink/20 px-5 py-2.5 font-ui text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
      >
        Ver equipe
      </Link>
    </Section>
  )
}

function Section({ children, tone }: { children: React.ReactNode; tone?: 'success' }) {
  return (
    <section
      className={[
        'relative overflow-hidden rounded-[32px] p-6 md:p-8',
        tone === 'success' ? 'border border-green-700/20 bg-green-500/10' : 'glass-panel',
      ].join(' ')}
    >
      {tone !== 'success' && <div className="purple-beam-soft opacity-35" />}
      <div className="relative">{children}</div>
    </section>
  )
}
