import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMe, updateMe } from '../api/me'
import type { UpdateMePayload } from '../types/participant'

export function useProfile() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateMePayload) => updateMe(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}
