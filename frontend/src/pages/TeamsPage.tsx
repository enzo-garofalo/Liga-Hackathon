import { useState } from 'react'
import { TeamCard } from '../components/TeamCard'
import { Button } from '../components/ui/Button'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { useProfile } from '../hooks/useProfile'
import { useOpenTeams } from '../hooks/useTeams'

export function TeamsPage() {
  const meQuery = useProfile()
  const teamsQuery = useOpenTeams()
  const me = meQuery.data
  const whatsappLink = (import.meta.env.VITE_WHATSAPP_LINK as string | undefined)?.trim()

  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <main className="px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-[#9497a9] font-ui uppercase tracking-widest mb-1">Equipes</p>
          <h1 className="font-display text-3xl font-semibold text-[#101114]">Equipes abertas</h1>
          <p className="text-sm text-[#9497a9] font-ui mt-1">
            Equipes em formação aceitando pedidos de entrada.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!me?.has_team && (
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              Criar equipe
            </Button>
          )}
          {!me?.has_team && whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              <Button variant="outlined">Quero formar equipe (WhatsApp)</Button>
            </a>
          )}
        </div>
      </div>

      {teamsQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white border border-[#dedee5] rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {teamsQuery.data?.length === 0 && (
        <p className="font-ui text-[#9497a9] text-sm">Nenhuma equipe aberta no momento.</p>
      )}
      {teamsQuery.data && teamsQuery.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsQuery.data.map(t => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}

      {createModalOpen && <CreateTeamModal onClose={() => setCreateModalOpen(false)} />}
    </main>
  )
}
