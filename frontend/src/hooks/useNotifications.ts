import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { list, markRead } from '../api/notifications'
import { getAccessToken, getSessionKind } from '../auth/storage'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => list(),
    enabled: getSessionKind() === 'participant' && !!getAccessToken(),
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
