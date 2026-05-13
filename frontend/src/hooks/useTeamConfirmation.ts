import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getTeam } from '../api/teams'

export function useTeamConfirmation() {
  const { id } = useParams<{ id: string }>()

  const query = useQuery({
    queryKey: ['team', id],
    queryFn: () => getTeam(id!),
    enabled: !!id,
  })

  return {
    team: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
