import type { AdminParticipant } from '../types/participant'
import type { Team, TeamStatus } from '../types/team'
import client from './client'

export const listTeams = (status?: TeamStatus) =>
  client
    .get<Team[]>('/admin/teams/', { params: status ? { status } : undefined })
    .then((r) => r.data)

export const approveTeam = (id: string) =>
  client.patch<Team>(`/admin/teams/${id}/approve/`).then((r) => r.data)

export const rejectTeam = (id: string) =>
  client.patch<Team>(`/admin/teams/${id}/reject/`).then((r) => r.data)

export const listParticipants = () =>
  client.get<AdminParticipant[]>('/admin/participants/').then((r) => r.data)
