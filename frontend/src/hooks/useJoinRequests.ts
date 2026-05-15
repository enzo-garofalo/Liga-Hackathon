import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptForTeam,
  createForTeam,
  declineForTeam,
  listForTeam,
} from '../api/joinRequests'

export function useTeamJoinRequests(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-join-requests', teamId],
    queryFn: () => listForTeam(teamId!),
    enabled: !!teamId,
  })
}

export function useCreateJoinRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => createForTeam(teamId),
    onSuccess: (_data, teamId) => {
      qc.invalidateQueries({ queryKey: ['team-join-requests', teamId] })
    },
  })
}

export function useAcceptJoinRequest(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => acceptForTeam(teamId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-join-requests', teamId] })
      qc.invalidateQueries({ queryKey: ['team', teamId] })
      qc.invalidateQueries({ queryKey: ['open-teams'] })
    },
  })
}

export function useDeclineJoinRequest(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => declineForTeam(teamId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-join-requests', teamId] })
    },
  })
}
