import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { ParticipantCard } from '../components/ParticipantCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useMe } from '../hooks/useAuth'
import { useParticipantSearch, useSendInvite } from '../hooks/useSendInvite'
import { useTeam } from '../hooks/useTeam'
import { getApiError } from '../utils/errors'

export function InvitePage() {
  const { id } = useParams<{ id: string }>()
  const meQuery = useMe()
  const teamQuery = useTeam(id)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [invited, setInvited] = useState<Set<string>>(new Set())

  const participantsQuery = useParticipantSearch(search)
  const sendInvite = useSendInvite(id ?? '')

  const me = meQuery.data
  const team = teamQuery.data
  const isLeader = me && team && team.leader.id === me.id

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleInvite = (participantId: string) => {
    sendInvite.mutate(participantId, {
      onSuccess: () => setInvited((prev) => new Set(prev).add(participantId)),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={me} />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {teamQuery.isLoading && (
          <p className="font-ui text-silver-blue">Carregando equipe...</p>
        )}
        {team && !isLeader && (
          <p className="font-ui text-red-500">
            Apenas o líder pode convidar membros.
          </p>
        )}
        {team && isLeader && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-3xl font-semibold text-near-black">
                  Convidar para {team.name}
                </h1>
                <p className="text-sm text-silver-blue font-ui">
                  {team.member_count}/4 membros
                </p>
              </div>
              <Link to={`/teams/${team.id}`}>
                <Button variant="ghost">Voltar para a equipe</Button>
              </Link>
            </div>

            <form onSubmit={handleSearch} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Buscar participante por nome"
                  placeholder="Ex: Ana Lima"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary">
                Buscar
              </Button>
            </form>

            {participantsQuery.isLoading && search && (
              <p className="font-ui text-silver-blue">Buscando...</p>
            )}
            {participantsQuery.data && participantsQuery.data.length === 0 && (
              <p className="font-ui text-silver-blue">
                Nenhum participante sem equipe encontrado para "{search}".
              </p>
            )}
            {sendInvite.error && (
              <p className="text-sm text-red-500 font-ui">
                {getApiError(sendInvite.error)}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4">
              {participantsQuery.data?.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  onInvite={() => handleInvite(p.id)}
                  invited={invited.has(p.id)}
                  loading={sendInvite.isPending && sendInvite.variables === p.id}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
