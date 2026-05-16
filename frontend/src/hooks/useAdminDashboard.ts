import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveTeam,
  listParticipants,
  listTeams,
  rejectTeam,
} from '../api/admin'
import { getAccessToken, getSessionKind } from '../auth/storage'
import type { TeamStatus } from '../types/team'

const adminEnabled = () =>
  getSessionKind() === 'admin' && !!getAccessToken()

export function useAdminTeams(status?: TeamStatus) {
  return useQuery({
    queryKey: ['admin-teams', status ?? 'submitted'],
    queryFn: () => listTeams(status),
    enabled: adminEnabled(),
  })
}

export function useApproveTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveTeam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })
}

export function useRejectTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rejectTeam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })
}

export function useAdminParticipants() {
  return useQuery({
    queryKey: ['admin-participants'],
    queryFn: listParticipants,
    enabled: adminEnabled(),
  })
}
