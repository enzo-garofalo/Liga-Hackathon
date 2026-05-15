import { Link } from 'react-router-dom'
import type { MeProfile } from '../types/participant'
import { Button } from './ui/Button'

interface StatusBannerProps {
  me: MeProfile
}

export function StatusBanner({ me }: StatusBannerProps) {
  if (!me.has_team) {
    return (
      <section className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8">
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
      </section>
    )
  }

  // Other variants (forming/submitted/approved/rejected) come in fase 12.
  return (
    <section className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8">
      <h2 className="font-display text-xl font-semibold text-near-black mb-2">
        Você já está em uma equipe
      </h2>
      <p className="text-sm text-silver-blue font-ui">
        Acesse a página da sua equipe para acompanhar o status. (UI completa chega na próxima fase.)
      </p>
    </section>
  )
}
