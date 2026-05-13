import logo from '../assets/logo.svg'
import { Badge } from '../components/ui/Badge'
import { useTeamConfirmation } from '../hooks/useTeamConfirmation'
import type { TeamStatus } from '../types'

const STATUS_BADGE: Record<TeamStatus, { variant: 'success' | 'neutral' | 'pending'; label: string }> =
  {
    approved: { variant: 'success', label: 'Aprovada' },
    rejected: { variant: 'neutral', label: 'Recusada' },
    pending: { variant: 'pending', label: 'Aguardando aprovação' },
  }

export function ConfirmationPage() {
  const { team, isLoading, isError } = useTeamConfirmation()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-[#dedee5] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src={logo} alt="Liga de TI" className="h-7" />
          <span className="font-display font-semibold text-near-black">Liga de TI</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {isLoading && (
          <p className="text-center text-silver-blue font-ui text-sm">Carregando...</p>
        )}

        {(isError || (!isLoading && !team)) && (
          <p className="text-center text-red-500 font-ui text-sm">Equipe não encontrada.</p>
        )}

        {team && (
          <>
            <div className="text-center mb-10">
              <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#149e61"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-semibold text-near-black">
                Inscrição recebida!
              </h1>
              <p className="mt-2 text-sm text-silver-blue font-ui">
                Sua inscrição foi recebida e está aguardando aprovação.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-near-black">
                    {team.name}
                  </h2>
                  <p className="text-sm text-silver-blue font-ui mt-0.5">{team.title}</p>
                </div>
                <Badge variant={STATUS_BADGE[team.status].variant}>
                  {STATUS_BADGE[team.status].label}
                </Badge>
              </div>

              <div>
                <p className="text-xs font-ui font-medium text-silver-blue uppercase tracking-wide mb-2">
                  Proposta
                </p>
                <p className="text-sm text-near-black font-ui leading-relaxed">{team.proposal}</p>
              </div>

              <div>
                <p className="text-xs font-ui font-medium text-silver-blue uppercase tracking-wide mb-3">
                  Participantes
                </p>
                <ul className="space-y-2">
                  {team.participants.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className="text-sm font-ui text-near-black">{p.full_name}</span>
                      {p.is_leader && <Badge variant="pending">Líder</Badge>}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-ui font-medium text-silver-blue uppercase tracking-wide mb-1">
                  ID da inscrição
                </p>
                <p className="text-xs font-ui text-silver-blue font-mono">{team.id}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
