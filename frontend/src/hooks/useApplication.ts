import { useQuery } from '@tanstack/react-query'
import { getMyApplication } from '../api/applications'
import { retryUnlessClientError } from '../utils/errors'

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => getMyApplication(id as string),
    retry: retryUnlessClientError,
    enabled: Boolean(id),
  })
}
