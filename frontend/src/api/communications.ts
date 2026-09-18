import type {
  Communication,
  CommunicationDetail,
  CommunicationPayload,
} from '../types/communication'
import client from './client'

export const listCommunications = (
  processId: string,
  filters: { type?: string; stage?: string; status?: string } = {},
) => {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value) params[key] = value
  }
  return client
    .get<Communication[]>(`/admin/processes/${processId}/communications/`, { params })
    .then((r) => r.data)
}

export const getCommunication = (id: string) =>
  client.get<CommunicationDetail>(`/admin/communications/${id}/`).then((r) => r.data)

export const sendCommunication = (processId: string, payload: CommunicationPayload) =>
  client
    .post<CommunicationDetail>(`/admin/processes/${processId}/communications/`, payload)
    .then((r) => r.data)
