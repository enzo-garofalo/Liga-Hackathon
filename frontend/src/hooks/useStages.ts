import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStage,
  deleteStage,
  listStages,
  reorderStages,
  updateStage,
} from '../api/stages'
import type { StagePayload } from '../types/stage'
import { retryUnlessClientError } from '../utils/errors'

export function useStages(processId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['stages', processId],
    queryFn: () => listStages(processId as string),
    enabled: Boolean(processId),
    retry: retryUnlessClientError,
  })

  // O detalhe do processo também traz etapas e contadores.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stages', processId] })
    queryClient.invalidateQueries({ queryKey: ['admin-process', processId] })
  }

  const create = useMutation({
    mutationFn: (payload: StagePayload) => createStage(processId as string, payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StagePayload> }) =>
      updateStage(id, payload),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteStage(id),
    onSuccess: invalidate,
  })

  const reorder = useMutation({
    mutationFn: (order: string[]) => reorderStages(processId as string, order),
    onSuccess: invalidate,
  })

  return { query, create, update, remove, reorder }
}
