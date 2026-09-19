import type { Stage, StagePayload } from '../types/stage'
import client from './client'

export const listStages = (processId: string) =>
  client.get<Stage[]>(`/admin/processes/${processId}/stages/`).then((r) => r.data)

export const createStage = (processId: string, payload: StagePayload) =>
  client
    .post<Stage>(`/admin/processes/${processId}/stages/`, payload)
    .then((r) => r.data)

export const updateStage = (stageId: string, payload: Partial<StagePayload>) =>
  client.patch<Stage>(`/admin/stages/${stageId}/`, payload).then((r) => r.data)

export const deleteStage = (stageId: string) =>
  client.delete<void>(`/admin/stages/${stageId}/`).then(() => undefined)

export const reorderStages = (processId: string, order: string[]) =>
  client
    .patch<Stage[]>(`/admin/processes/${processId}/stages/reorder/`, { order })
    .then((r) => r.data)

/**
 * O enunciado em PDF anda por fora do payload da etapa: é multipart, e o resto
 * da configuração é JSON.
 */
export const uploadStageInstructionsFile = (stageId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client
    .post<Stage>(`/admin/stages/${stageId}/instructions-file/`, form)
    .then((r) => r.data)
}

export const deleteStageInstructionsFile = (stageId: string) =>
  client
    .delete<Stage>(`/admin/stages/${stageId}/instructions-file/`)
    .then((r) => r.data)

export const downloadStageInstructionsFile = (stageId: string) =>
  client
    .get<Blob>(`/stages/${stageId}/instructions-file/download/`, {
      responseType: 'blob',
    })
    .then((r) => r.data)
