import { useQuery } from '@tanstack/react-query'
import { getProcess } from '../api/adminProcesses'
import { retryUnlessClientError } from '../utils/errors'

export function useAdminProcess(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-process', id],
    queryFn: () => getProcess(id as string),
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  })
}
