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
