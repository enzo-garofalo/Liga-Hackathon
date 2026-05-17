import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <p className="text-xs text-[#9497a9] font-ui uppercase tracking-widest mb-1">Equipes</p>
        <h1 className="font-display text-3xl font-semibold text-[#101114]">
          {team ? `Convidar para ${team.name}` : 'Convidar membro'}
        </h1>
        {team && (
          <p className="text-sm text-[#9497a9] font-ui mt-1">{team.member_count}/4 membros</p>
        )}
      </div>

      <div className="max-w-3xl space-y-6">
        {teamQuery.isLoading && (
          <p className="font-ui text-[#9497a9]">Carregando equipe...</p>
        )}
        {team && !isLeader && (
          <p className="font-ui text-red-500">Apenas o líder pode convidar membros.</p>
        )}
        {team && isLeader && (
          <>
            <div className="flex justify-end">
              <Link to={`/teams/${team.id}`}>
                <Button variant="ghost">← Voltar para a equipe</Button>
              </Link>
            </div>

            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl border border-[#dedee5] p-6 flex items-end gap-3"
            >
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
              <p className="font-ui text-[#9497a9]">Buscando...</p>
            )}
            {participantsQuery.data && participantsQuery.data.length === 0 && (
              <p className="font-ui text-[#9497a9]">
                Nenhum participante sem equipe encontrado para "{search}".
              </p>
            )}
            {sendInvite.error && (
              <p className="text-sm text-red-500 font-ui">{getApiError(sendInvite.error)}</p>
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
      </div>
    </main>
  )
}
