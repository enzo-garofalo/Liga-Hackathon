import type { ProcessDetail, ProcessSummary } from '../types/process'
import client from './client'

export const getProcesses = () =>
  client.get<ProcessSummary[]>('/processes/').then((r) => r.data)

export const getProcess = (id: string) =>
  client.get<ProcessDetail>(`/processes/${id}/`).then((r) => r.data)

export const applyToProcess = (id: string) =>
  client.post<{ id: string }>(`/processes/${id}/apply/`).then((r) => r.data)

export const withdrawFromProcess = (id: string) =>
  client.post<{ id: string }>(`/processes/${id}/withdraw/`).then((r) => r.data)
