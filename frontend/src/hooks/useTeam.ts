import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getTeam,
  leaveTeam,
  removeMember,
  submitTeam,
  updateTeam,
} from '../api/teams'
import type { TeamUpdatePayload } from '../types/team'

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => getTeam(id!),
    enabled: !!id,
  })
}

function teamMutationKeys(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  return () => {
    queryClient.invalidateQueries({ queryKey: ['team', id] })
    queryClient.invalidateQueries({ queryKey: ['me'] })
    queryClient.invalidateQueries({ queryKey: ['open-teams'] })
  }
}

export function useUpdateTeam(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TeamUpdatePayload) => updateTeam(id, payload),
    onSuccess: teamMutationKeys(qc, id),
  })
}

export function useSubmitTeam(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => submitTeam(id),
    onSuccess: teamMutationKeys(qc, id),
  })
}

export function useLeaveTeam(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaveTeam(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['team', id] })
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['open-teams'] })
    },
  })
}

export function useRemoveMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (participantId: string) => removeMember(id, participantId),
    onSuccess: teamMutationKeys(qc, id),
  })
}
