import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getApplication,
  getEvaluations,
  saveEvaluation,
} from '../api/adminApplications'
import type { EvaluationPayload } from '../types/evaluation'
import { retryUnlessClientError } from '../utils/errors'

export function useApplicationDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-application', id],
    queryFn: () => getApplication(id as string),
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  })
}

export function useEvaluationSummary(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['evaluations', id],
    queryFn: () => getEvaluations(id as string),
    enabled: Boolean(id) && enabled,
    retry: retryUnlessClientError,
  })
}

export function useSaveEvaluation(applicationId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: EvaluationPayload) =>
      saveEvaluation(applicationId as string, payload),
    onSuccess: () => {
      // A média aparece na ficha, no resumo e na coluna da tabela.
      queryClient.invalidateQueries({ queryKey: ['admin-application', applicationId] })
      queryClient.invalidateQueries({ queryKey: ['evaluations', applicationId] })
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
    },
  })
}
