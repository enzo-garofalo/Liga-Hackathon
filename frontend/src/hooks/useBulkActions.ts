import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runBulkAction } from '../api/adminApplications'
import type { BulkActionPayload } from '../types/adminApplication'

export function useBulkActions(processId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkActionPayload) =>
      runBulkAction(processId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      // Contadores, etapas e histórico de comunicação mudam junto.
      queryClient.invalidateQueries({ queryKey: ['admin-process', processId] })
      queryClient.invalidateQueries({ queryKey: ['communications', processId] })
    },
  })
}
