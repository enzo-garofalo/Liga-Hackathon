import { useState } from 'react'
import { Users } from 'lucide-react'
import { TeamCard } from '../components/TeamCard'
import { TeamPreviewModal } from '../components/TeamPreviewModal'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { Button } from '../components/ui/Button'
import { useProfile } from '../hooks/useProfile'
import { useOpenTeams } from '../hooks/useTeams'
import type { Team } from '../types/team'

export function TeamsPage() {
  const meQuery    = useProfile()
  const teamsQuery = useOpenTeams()
  const me         = meQuery.data

  const [selectedTeam, setSelectedTeam]         = useState<Team | null>(null)
  const [createModalOpen, setCreateModalOpen]   = useState(false)

  const whatsappLink = (import.meta.env.VITE_WHATSAPP_LINK as string | undefined)?.trim()

  return (
    <main className="px-4 py-6 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="text-xs text-[#9497a9] font-ui uppercase tracking-widest mb-2">Equipes</p>
          <h1 className="font-display text-3xl font-bold text-[#101114]">Equipes abertas</h1>
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
              <Button variant="outlined">Grupo WhatsApp</Button>
            </a>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {teamsQuery.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!teamsQuery.isLoading && teamsQuery.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-purple-300" />
          </div>
          <p className="font-display font-semibold text-[#101114] mb-1">Nenhuma equipe aberta</p>
          <p className="text-sm text-[#9497a9] font-ui">Crie uma equipe e encontre seus companheiros.</p>
        </div>
      )}

      {/* Grid */}
      {teamsQuery.data && teamsQuery.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsQuery.data.map(t => (
            <TeamCard key={t.id} team={t} onClick={() => setSelectedTeam(t)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedTeam && (
        <TeamPreviewModal
          team={selectedTeam}
          meId={me?.id ?? null}
          meHasTeam={me?.has_team ?? false}
          onClose={() => setSelectedTeam(null)}
        />
      )}
      {createModalOpen && <CreateTeamModal onClose={() => setCreateModalOpen(false)} />}
    </main>
  )
}
