import { useQuery } from '@tanstack/react-query'
import { getProcesses } from '../api/processes'
import { retryUnlessClientError } from '../utils/errors'

export function useProcesses() {
  return useQuery({
    queryKey: ['processes'],
    queryFn: getProcesses,
    retry: retryUnlessClientError,
  })
}
