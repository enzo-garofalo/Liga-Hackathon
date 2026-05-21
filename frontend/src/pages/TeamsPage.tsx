import { MessageCircle, Users } from 'lucide-react'
import { useState } from 'react'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { TeamCard } from '../components/TeamCard'
import { TeamPreviewModal } from '../components/TeamPreviewModal'
import { Button } from '../components/ui/Button'
import { useProfile } from '../hooks/useProfile'
import { useOpenTeams } from '../hooks/useTeams'
import type { Team } from '../types/team'

export function TeamsPage() {
  const meQuery = useProfile()
  const teamsQuery = useOpenTeams()
  const me = meQuery.data

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const whatsappLink = (import.meta.env.VITE_WHATSAPP_LINK as string | undefined)?.trim()

  return (
    <main className="px-4 py-6 text-ink md:px-10 md:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker mb-2">Equipes</p>
          <h1 className="font-display text-5xl font-light text-ink">Equipes abertas</h1>
          <p className="mt-2 text-sm text-ink/70">
            Equipes em formação aceitando pedidos de entrada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!me?.has_team && (
            <Button onClick={() => setCreateModalOpen(true)}>
              Criar equipe
            </Button>
          )}
          {!me?.has_team && whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#149e61] px-5 py-2.5 font-ui text-sm font-semibold text-white shadow-[0_14px_32px_rgba(20,158,97,0.18)] transition-colors hover:bg-[#108150]"
            >
              <MessageCircle className="h-4 w-4" />
              Grupo WhatsApp
            </a>
          )}
        </div>
      </div>

      {teamsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dark-card h-40 animate-pulse rounded-[21px]" />
          ))}
        </div>
      )}

      {!teamsQuery.isLoading && teamsQuery.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15">
            <Users className="h-7 w-7 text-brand-soft" />
          </div>
          <p className="mb-1 font-display font-semibold text-ink">Nenhuma equipe aberta</p>
          <p className="text-sm text-ink/70">Crie uma equipe e encontre seus companheiros.</p>
        </div>
      )}

      {teamsQuery.data && teamsQuery.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamsQuery.data.map((team) => (
            <TeamCard key={team.id} team={team} onClick={() => setSelectedTeam(team)} />
          ))}
        </div>
      )}

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
