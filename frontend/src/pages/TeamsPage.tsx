import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { TeamCard } from '../components/TeamCard'
import { Button } from '../components/ui/Button'
import { useMe } from '../hooks/useAuth'
import { useOpenTeams } from '../hooks/useTeams'

export function TeamsPage() {
  const meQuery = useMe()
  const teamsQuery = useOpenTeams()
  const me = meQuery.data
  const whatsappLink = (import.meta.env.VITE_WHATSAPP_LINK as string | undefined)?.trim()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={me} />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-near-black">
              Equipes abertas
            </h1>
            <p className="text-sm text-silver-blue font-ui">
              Equipes em formação aceitando pedidos de entrada.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!me?.has_team && (
              <Link to="/teams/new">
                <Button variant="primary">Criar equipe</Button>
              </Link>
            )}
            {!me?.has_team && whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <Button variant="outlined">Quero formar equipe (WhatsApp)</Button>
              </a>
            )}
          </div>
        </div>

        {teamsQuery.isLoading && (
          <p className="font-ui text-silver-blue">Carregando equipes...</p>
        )}
        {teamsQuery.data && teamsQuery.data.length === 0 && (
          <p className="font-ui text-silver-blue">
            Nenhuma equipe aberta no momento.
          </p>
        )}
        {teamsQuery.data && teamsQuery.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsQuery.data.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
