import type { TeamMinimal } from './team'

export interface ParticipantSummary {
  id: string
  full_name: string
  course: string
  semester: number
  bio: string
  github: string | null
  linkedin: string | null
}

export interface MeProfile extends ParticipantSummary {
  email: string
  has_team: boolean
  team: TeamMinimal | null
  created_at: string
  updated_at: string
}

export interface UpdateMePayload {
  full_name?: string
  course?: string
  semester?: number
  bio?: string
  github?: string | null
  linkedin?: string | null
}
