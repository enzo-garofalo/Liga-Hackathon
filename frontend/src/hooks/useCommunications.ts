import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCommunication,
  listCommunications,
  sendCommunication,
} from '../api/communications'
import type { CommunicationPayload } from '../types/communication'
import { retryUnlessClientError } from '../utils/errors'

export function useCommunications(
  processId: string | undefined,
  filters: { type?: string; stage?: string; status?: string } = {},
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['communications', processId, filters],
    queryFn: () => listCommunications(processId as string, filters),
    enabled: Boolean(processId),
    retry: retryUnlessClientError,
  })

  const send = useMutation({
    mutationFn: (payload: CommunicationPayload) =>
      sendCommunication(processId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', processId] })
    },
  })

  return { query, send }
}

export function useCommunication(id: string | undefined) {
  return useQuery({
    queryKey: ['communication', id],
    queryFn: () => getCommunication(id as string),
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  })
}
