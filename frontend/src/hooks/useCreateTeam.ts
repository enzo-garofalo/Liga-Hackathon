import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createTeam } from '../api/teams'
import type { TeamCreatePayload } from '../types/team'

export function useCreateTeam() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TeamCreatePayload) => createTeam(payload),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['open-teams'] })
      navigate(`/teams/${team.id}`)
    },
  })
}
