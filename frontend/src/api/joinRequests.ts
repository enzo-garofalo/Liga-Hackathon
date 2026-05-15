import type { JoinRequest } from '../types/invite'
import client from './client'

export const listForTeam = (teamId: string) =>
  client.get<JoinRequest[]>(`/teams/${teamId}/join-requests/`).then((r) => r.data)

export const createForTeam = (teamId: string) =>
  client.post<JoinRequest>(`/teams/${teamId}/join-requests/`, {}).then((r) => r.data)

export const acceptForTeam = (teamId: string, requestId: string) =>
  client
    .post<JoinRequest>(`/teams/${teamId}/join-requests/${requestId}/accept/`)
    .then((r) => r.data)

export const declineForTeam = (teamId: string, requestId: string) =>
  client
    .post<JoinRequest>(`/teams/${teamId}/join-requests/${requestId}/decline/`)
    .then((r) => r.data)
