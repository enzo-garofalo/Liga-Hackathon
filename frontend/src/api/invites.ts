import type { TeamInvite } from '../types/invite'
import client from './client'

export const listMyInvites = () =>
  client.get<TeamInvite[]>('/me/invites/').then((r) => r.data)

export const createInvite = (teamId: string, inviteeId: string) =>
  client
    .post<TeamInvite>(`/teams/${teamId}/invites/`, { invitee_id: inviteeId })
    .then((r) => r.data)

export const acceptInvite = (inviteId: string) =>
  client.post<TeamInvite>(`/me/invites/${inviteId}/accept/`).then((r) => r.data)

export const declineInvite = (inviteId: string) =>
  client.post<TeamInvite>(`/me/invites/${inviteId}/decline/`).then((r) => r.data)
