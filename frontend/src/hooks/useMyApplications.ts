import { useQuery } from '@tanstack/react-query'
import { getMyApplications } from '../api/applications'
import { retryUnlessClientError } from '../utils/errors'

export function useMyApplications() {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: getMyApplications,
    retry: retryUnlessClientError,
  })
}
