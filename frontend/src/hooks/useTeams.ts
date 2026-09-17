import { useQuery } from '@tanstack/react-query'
import { getOpenTeams } from '../api/teams'

/** `enabled` existe para o dashboard nao consultar equipes com o hackathon desativado. */
export function useOpenTeams(enabled = true) {
  return useQuery({
    queryKey: ['open-teams'],
    queryFn: getOpenTeams,
    enabled,
  })
}
