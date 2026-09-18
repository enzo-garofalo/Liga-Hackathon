import type {
  AdminProcess,
  AdminProcessDetail,
  ProcessPayload,
  PublishPayload,
} from '../types/adminProcess'
import type { OrganizerProfile } from '../types/adminApplication'
import client from './client'

export const listProcesses = () =>
  client.get<AdminProcess[]>('/admin/processes/').then((r) => r.data)

export const getProcess = (id: string) =>
  client.get<AdminProcessDetail>(`/admin/processes/${id}/`).then((r) => r.data)

export const createProcess = (payload: ProcessPayload) =>
  client.post<AdminProcess>('/admin/processes/', payload).then((r) => r.data)

export const updateProcess = (id: string, payload: Partial<ProcessPayload>) =>
  client.patch<AdminProcess>(`/admin/processes/${id}/`, payload).then((r) => r.data)

export const deleteProcess = (id: string) =>
  client.delete<void>(`/admin/processes/${id}/`).then(() => undefined)

export const publishProcess = (id: string, payload: PublishPayload = {}) =>
  client
    .post<AdminProcessDetail>(`/admin/processes/${id}/publish/`, payload)
    .then((r) => r.data)

export const closeProcess = (id: string) =>
  client.post<AdminProcessDetail>(`/admin/processes/${id}/close/`).then((r) => r.data)

export const getOrganizerProfile = () =>
  client.get<OrganizerProfile>('/admin/me/').then((r) => r.data)

export const updateOrganizerProfile = (payload: Partial<OrganizerProfile>) =>
  client.patch<OrganizerProfile>('/admin/me/', payload).then((r) => r.data)
