import type { ParticipantSummary } from '../types/participant'
import type { Team, TeamCreatePayload, TeamUpdatePayload } from '../types/team'
import client from './client'

export const getOpenTeams = () =>
  client.get<Team[]>('/teams/').then((r) => r.data)

export const getTeam = (id: string) =>
  client.get<Team>(`/teams/${id}/`).then((r) => r.data)

export const createTeam = (payload: TeamCreatePayload) =>
  client.post<Team>('/teams/', payload).then((r) => r.data)

export const updateTeam = (id: string, payload: TeamUpdatePayload) =>
  client.patch<Team>(`/teams/${id}/`, payload).then((r) => r.data)

export const submitTeam = (id: string) =>
  client.post<Team>(`/teams/${id}/submit/`).then((r) => r.data)

export const leaveTeam = (id: string) =>
  client.delete<void>(`/teams/${id}/leave/`).then(() => undefined)

export const removeMember = (teamId: string, participantId: string) =>
  client.delete<void>(`/teams/${teamId}/members/${participantId}/`).then(() => undefined)

export const getParticipants = (search?: string) =>
  client
    .get<ParticipantSummary[]>('/participants/', { params: search ? { search } : undefined })
    .then((r) => r.data)
