import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listApplications } from '../api/adminApplications'
import type { ApplicationFilters } from '../types/adminApplication'
import { retryUnlessClientError } from '../utils/errors'

export function useApplications(
  processId: string | undefined,
  filters: ApplicationFilters = {},
) {
  return useQuery({
    queryKey: ['admin-applications', processId, filters],
    queryFn: () => listApplications(processId as string, filters),
    enabled: Boolean(processId),
    retry: retryUnlessClientError,
    // Mantém a tabela na tela enquanto um filtro novo carrega, em vez de piscar.
    placeholderData: keepPreviousData,
  })
}
