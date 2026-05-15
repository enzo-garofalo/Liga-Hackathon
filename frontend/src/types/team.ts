import type { ParticipantSummary } from './participant'

export type TeamStatus = 'forming' | 'submitted' | 'approved' | 'rejected'

export interface TeamMinimal {
  id: string
  name: string
  is_open: boolean
  status: TeamStatus
  member_count: number
}

export interface Team {
  id: string
  name: string
  leader: ParticipantSummary
  members: ParticipantSummary[]
  member_count: number
  is_open: boolean
  status: TeamStatus
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface TeamCreatePayload {
  name: string
  is_open?: boolean
}

export interface TeamUpdatePayload {
  name?: string
  is_open?: boolean
}
