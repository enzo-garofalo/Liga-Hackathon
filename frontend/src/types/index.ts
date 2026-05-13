export type TeamStatus = 'pending' | 'approved' | 'rejected'

export interface Participant {
  id: string
  full_name: string
  email: string
  phone: string
  ra: string
  github: string | null
  is_leader: boolean
}

export interface Team {
  id: string
  name: string
  title: string
  proposal: string
  status: TeamStatus
  created_at: string
  updated_at: string
  participants: Participant[]
}

export interface CreateTeamPayload {
  name: string
  title: string
  proposal: string
  participants: Array<{
    full_name: string
    email: string
    phone: string
    ra: string
    github: string | null
    is_leader: boolean
  }>
}
