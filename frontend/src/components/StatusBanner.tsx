import { Link, useNavigate } from 'react-router-dom'
import { useSubmitTeam } from '../hooks/useTeam'
import type { MeProfile } from '../types/participant'
import type { TeamMinimal } from '../types/team'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface StatusBannerProps {
  me: MeProfile
}

export function StatusBanner({ me }: StatusBannerProps) {
  if (!me.team) {
    return <NoTeamBanner />
  }
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
      <h2 className="font-display text-xl font-semibold text-near-black mb-2">
        Você ainda não está em uma equipe
      </h2>
      <p className="text-sm text-silver-blue font-ui mb-6">
        Crie a sua ou explore equipes abertas que estão procurando membros.
      </p>
      <div className="flex items-center gap-3">
        <Link to="/teams/new">
          <Button variant="primary">Criar equipe</Button>
        </Link>
        <Link to="/teams">
          <Button variant="outlined">Explorar equipes abertas</Button>
        </Link>
      </div>
    </Section>
  )
}

function FormingBanner({ team }: { me: MeProfile; team: TeamMinimal }) {
  const navigate = useNavigate()
  const submit = useSubmitTeam(team.id)
  const canSubmit = team.member_count === 4

  const handleSubmit = () => {
    if (!window.confirm('Tem certeza que deseja submeter a equipe? Após submeter, ninguém pode mais entrar ou sair.')) return
    submit.mutate(undefined, {
      onSuccess: () => navigate(`/teams/${team.id}`),
    })
  }

  return (
    <Section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-semibold text-near-black">{team.name}</h2>
        <Badge variant="pending">Em formação</Badge>
      </div>
      <p className="text-sm text-silver-blue font-ui mb-6">
        {team.member_count}/4 membros · {team.is_open ? 'Aceitando pedidos' : 'Fechada'}
      </p>
      <div className="flex items-center gap-3">
        <Link to={`/teams/${team.id}`}>
          <Button variant="outlined">Ver equipe</Button>
        </Link>
        {canSubmit && (
          <Button variant="primary" onClick={handleSubmit} loading={submit.isPending}>
            Submeter para análise
          </Button>
        )}
      </div>
      {!canSubmit && (
        <p className="mt-4 text-xs text-silver-blue font-ui">
          A equipe precisa ter 4 membros para ser submetida.
        </p>
      )}
    </Section>
  )
}

function SubmittedBanner({ team }: { team: TeamMinimal }) {
  return (
    <Section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-semibold text-near-black">{team.name}</h2>
        <Badge variant="pending">Submetida</Badge>
      </div>
      <p className="text-sm text-silver-blue font-ui mb-6">
        Equipe submetida para análise. Aguardem o resultado por e-mail.
      </p>
      <Link to={`/teams/${team.id}`}>
        <Button variant="outlined">Ver equipe</Button>
      </Link>
    </Section>
  )
}

function ApprovedBanner({ team }: { team: TeamMinimal }) {
  return (
    <section className="bg-brand-green/5 rounded-2xl border border-brand-green/30 shadow-whisper p-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-semibold text-near-black">{team.name}</h2>
        <Badge variant="success">Aprovada</Badge>
      </div>
      <p className="text-sm text-near-black font-ui mb-6">
        Parabéns! A equipe foi selecionada para o Hackathon.
      </p>
      <Link to={`/teams/${team.id}`}>
        <Button variant="primary">Ver equipe</Button>
      </Link>
    </section>
  )
}

function RejectedBanner({ team }: { team: TeamMinimal }) {
  return (
    <Section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-semibold text-near-black">{team.name}</h2>
        <Badge variant="neutral">Não selecionada</Badge>
      </div>
      <p className="text-sm text-silver-blue font-ui mb-6">
        A equipe não foi selecionada nesta edição. Esperamos vocês nas próximas!
      </p>
      <Link to={`/teams/${team.id}`}>
        <Button variant="outlined">Ver equipe</Button>
      </Link>
    </Section>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8">
      {children}
    </section>
  )
}
