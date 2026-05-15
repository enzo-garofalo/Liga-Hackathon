import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { acceptInvite, declineInvite, listMyInvites } from '../api/invites'

export function useMyInvites() {
  return useQuery({
    queryKey: ['my-invites'],
    queryFn: listMyInvites,
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => acceptInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-invites'] })
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['open-teams'] })
    },
  })
}

export function useDeclineInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => declineInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-invites'] })
    },
  })
}
