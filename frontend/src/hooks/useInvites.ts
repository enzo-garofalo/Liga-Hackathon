import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { acceptInvite, declineInvite, listMyInvites } from '../api/invites'

/** `enabled` existe para o dashboard nao consultar convites com o hackathon desativado. */
export function useMyInvites(enabled = true) {
  return useQuery({
    queryKey: ['my-invites'],
    queryFn: listMyInvites,
    enabled,
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
