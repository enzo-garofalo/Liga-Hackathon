import { useQuery } from '@tanstack/react-query'
import { getOpenTeams } from '../api/teams'

export function useOpenTeams() {
  return useQuery({
    queryKey: ['open-teams'],
    queryFn: getOpenTeams,
  })
}
