import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getParticipants } from '../api/teams'
import { createInvite } from '../api/invites'

export function useParticipantSearch(search: string) {
  return useQuery({
    queryKey: ['participants', search],
    queryFn: () => getParticipants(search || undefined),
    enabled: search.trim().length > 0,
  })
}

export function useSendInvite(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteeId: string) => createInvite(teamId, inviteeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', teamId] })
    },
  })
}
