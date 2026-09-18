import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeProcess,
  createProcess,
  deleteProcess,
  listProcesses,
  publishProcess,
  updateProcess,
} from '../api/adminProcesses'
import type { ProcessPayload, PublishPayload } from '../types/adminProcess'
import { retryUnlessClientError } from '../utils/errors'

export function useAdminProcesses() {
  return useQuery({
    queryKey: ['admin-processes'],
    queryFn: listProcesses,
    retry: retryUnlessClientError,
  })
}

/** Toda mutação de processo invalida a lista e o detalhe. */
function useProcessMutation<TArgs, TData>(fn: (args: TArgs) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TArgs>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-processes'] })
      queryClient.invalidateQueries({ queryKey: ['admin-process'] })
    },
  })
}

export function useCreateProcess() {
  return useProcessMutation((payload: ProcessPayload) => createProcess(payload))
}

export function useUpdateProcess() {
  return useProcessMutation(
    ({ id, payload }: { id: string; payload: Partial<ProcessPayload> }) =>
      updateProcess(id, payload),
  )
}

export function usePublishProcess() {
  return useProcessMutation(
    ({ id, payload }: { id: string; payload?: PublishPayload }) =>
      publishProcess(id, payload ?? {}),
  )
}

export function useCloseProcess() {
  return useProcessMutation((id: string) => closeProcess(id))
}

export function useDeleteProcess() {
  return useProcessMutation((id: string) => deleteProcess(id))
}
