import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrganizerProfile, updateOrganizerProfile } from '../api/adminProcesses'
import type { OrganizerProfile } from '../types/adminApplication'
import { retryUnlessClientError } from '../utils/errors'

export function useOrganizerProfile() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['organizer-profile'],
    queryFn: getOrganizerProfile,
    retry: retryUnlessClientError,
  })

  const update = useMutation({
    mutationFn: (payload: Partial<OrganizerProfile>) => updateOrganizerProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(['organizer-profile'], profile)
    },
  })

  return { query, update }
}
