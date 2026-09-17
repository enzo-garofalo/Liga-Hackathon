import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { applyToProcess, getProcess } from '../api/processes'
import { retryUnlessClientError } from '../utils/errors'

export function useProcess(id: string | undefined) {
  return useQuery({
    queryKey: ['process', id],
    queryFn: () => getProcess(id as string),
    retry: retryUnlessClientError,
    enabled: Boolean(id),
  })
}

export function useApplyToProcess(id: string | undefined) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => applyToProcess(id as string),
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      navigate(`/applications/${application.id}`)
    },
  })
}
