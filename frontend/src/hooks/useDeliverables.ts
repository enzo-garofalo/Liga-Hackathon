import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDeliverable, uploadDeliverable } from '../api/applications'

export function useDeliverables(applicationId: string | undefined) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['application', applicationId] })

  const upload = useMutation({
    mutationFn: (file: File) => uploadDeliverable(applicationId as string, file),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (deliverableId: string) =>
      deleteDeliverable(applicationId as string, deliverableId),
    onSuccess: invalidate,
  })

  return { upload, remove }
}
