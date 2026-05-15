import type { ParticipantSummary } from './participant'
import type { TeamMinimal } from './team'

export type InviteStatus = 'pending' | 'accepted' | 'declined'

export interface TeamInvite {
  id: string
  team: TeamMinimal
  invitee: ParticipantSummary
  invited_by: ParticipantSummary
  status: InviteStatus
  created_at: string
}

export interface JoinRequest {
  id: string
  team: TeamMinimal
  requester: ParticipantSummary
  status: InviteStatus
  created_at: string
}
