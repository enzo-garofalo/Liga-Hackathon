import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { approveTeam, getAdminTeams, rejectTeam } from '../api/teams'
import type { Team } from '../types'

export type ActionType = 'approve' | 'reject'

export interface PendingAction {
  team: Team
  action: ActionType
}

export function useAdminDashboard() {
  const [statusFilter, setStatusFilter] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const queryClient = useQueryClient()

  const teamsQuery = useQuery({
    queryKey: ['admin-teams'],
    queryFn: getAdminTeams,
  })

  const allTeams = teamsQuery.data ?? []
  const teams = statusFilter ? allTeams.filter((t) => t.status === statusFilter) : allTeams
  const approvedCount = allTeams.filter((t) => t.status === 'approved').length

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
    setPendingAction(null)
  }

  const approveMutation = useMutation({ mutationFn: approveTeam, onSuccess: invalidate })
  const rejectMutation = useMutation({ mutationFn: rejectTeam, onSuccess: invalidate })

  const confirmAction = () => {
    if (!pendingAction) return
    pendingAction.action === 'approve'
      ? approveMutation.mutate(pendingAction.team.id)
      : rejectMutation.mutate(pendingAction.team.id)
  }

  return {
    teams,
    isLoading: teamsQuery.isLoading,
    approvedCount,
    statusFilter,
    setStatusFilter,
    pendingAction,
    setPendingAction,
    confirmAction,
    isMutating: approveMutation.isPending || rejectMutation.isPending,
    mutationError: approveMutation.error ?? rejectMutation.error,
  }
}
