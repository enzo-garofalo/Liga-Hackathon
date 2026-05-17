import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeam } from '../api/teams'
import { createInvite } from '../api/invites'

interface CreateTeamWithInvitesPayload {
  name: string
  isOpen: boolean
  invitees: { id: string }[]
}

export function useCreateTeamWithInvites() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, isOpen, invitees }: CreateTeamWithInvitesPayload) => {
      const team = await createTeam({ name, is_open: isOpen })
      await Promise.all(
        invitees.map((invitee) => createInvite(team.id, invitee.id))
      )
      return team
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
