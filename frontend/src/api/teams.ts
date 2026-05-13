import type { CreateTeamPayload, Team } from '../types'
import client from './client'

export const createTeam = (payload: CreateTeamPayload) =>
  client.post<Team>('/teams/', payload).then((r) => r.data)

export const getTeam = (id: string) =>
  client.get<Team>(`/teams/${id}/`).then((r) => r.data)

export const getAdminTeams = () =>
  client.get<Team[]>('/admin/teams/').then((r) => r.data)

export const approveTeam = (id: string) =>
  client.patch<Team>(`/admin/teams/${id}/approve/`).then((r) => r.data)

export const rejectTeam = (id: string) =>
  client.patch<Team>(`/admin/teams/${id}/reject/`).then((r) => r.data)

export const loginAdmin = (username: string, password: string) =>
  client
    .post<{ access: string; refresh: string }>('/auth/token/', { username, password })
    .then((r) => r.data)
