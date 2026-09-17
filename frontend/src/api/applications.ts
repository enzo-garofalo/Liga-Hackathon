import type {
  ApplicationDetail,
  ApplicationSummary,
  Deliverable,
} from '../types/application'
import client from './client'

export const getMyApplications = () =>
  client.get<ApplicationSummary[]>('/me/applications/').then((r) => r.data)

export const getMyApplication = (id: string) =>
  client.get<ApplicationDetail>(`/me/applications/${id}/`).then((r) => r.data)

export const uploadDeliverable = (applicationId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client
    .post<Deliverable>(`/me/applications/${applicationId}/deliverables/`, form)
    .then((r) => r.data)
}

export const deleteDeliverable = (applicationId: string, deliverableId: string) =>
  client
    .delete<void>(`/me/applications/${applicationId}/deliverables/${deliverableId}/`)
    .then(() => undefined)

/**
 * Baixa o arquivo pelo client autenticado.
 *
 * Um link comum (`<a href>`) nao envia o token e o backend responde 401 — os
 * entregaveis nao ficam em URL publica de proposito.
 */
export const downloadDeliverable = (deliverableId: string) =>
  client
    .get<Blob>(`/deliverables/${deliverableId}/download/`, { responseType: 'blob' })
    .then((r) => r.data)
