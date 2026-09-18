import type {
  AdminApplicationDetail,
  ApplicationFilters,
  ApplicationRow,
  BulkActionPayload,
  Paginated,
} from '../types/adminApplication'
import type { EvaluationPayload, StageEvaluationSummary } from '../types/evaluation'
import client from './client'

export const listApplications = (processId: string, filters: ApplicationFilters = {}) => {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = value
  }
  return client
    .get<Paginated<ApplicationRow>>(`/admin/processes/${processId}/applications/`, {
      params,
    })
    .then((r) => r.data)
}

export const getApplication = (id: string) =>
  client.get<AdminApplicationDetail>(`/admin/applications/${id}/`).then((r) => r.data)

export const getEvaluations = (id: string) =>
  client
    .get<StageEvaluationSummary[]>(`/admin/applications/${id}/evaluations/`)
    .then((r) => r.data)

export const saveEvaluation = (id: string, payload: EvaluationPayload) =>
  client
    .post<StageEvaluationSummary[]>(`/admin/applications/${id}/evaluations/`, payload)
    .then((r) => r.data)

export const runBulkAction = (processId: string, payload: BulkActionPayload) =>
  client
    .post<{ updated: number }>(
      `/admin/processes/${processId}/applications/bulk-action/`,
      payload,
    )
    .then((r) => r.data)
