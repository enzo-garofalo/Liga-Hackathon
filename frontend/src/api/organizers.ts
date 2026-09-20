import type {
  AssignmentBoard,
  AutoDistributePayload,
  AutoDistributeResult,
  OrganizerInvitePayload,
  ProcessOrganizer,
  SetEvaluatorsPayload,
  StageAssignments,
} from '../types/organizer'
import client from './client'

export const listProcessOrganizers = (processId: string) =>
  client
    .get<ProcessOrganizer[]>(`/admin/processes/${processId}/organizers/`)
    .then((r) => r.data)

export const inviteOrganizer = (processId: string, payload: OrganizerInvitePayload) =>
  client
    .post<ProcessOrganizer[]>(`/admin/processes/${processId}/organizers/`, payload)
    .then((r) => r.data)

export const resendOrganizerInvite = (processId: string, userId: number) =>
  client
    .post(`/admin/processes/${processId}/organizers/${userId}/`)
    .then((r) => r.data)

export const removeOrganizer = (processId: string, userId: number) =>
  client.delete(`/admin/processes/${processId}/organizers/${userId}/`)

export const getStageAssignments = (stageId: string) =>
  client
    .get<StageAssignments>(`/admin/stages/${stageId}/assignments/`)
    .then((r) => r.data)

export const autoDistribute = (stageId: string, payload: AutoDistributePayload) =>
  client
    .post<AutoDistributeResult>(`/admin/stages/${stageId}/assignments/auto/`, payload)
    .then((r) => r.data)

export const getAssignmentBoard = (processId: string) =>
  client
    .get<AssignmentBoard>(`/admin/processes/${processId}/assignments/`)
    .then((r) => r.data)

export const setEvaluators = (processId: string, payload: SetEvaluatorsPayload) =>
  client
    .post<AssignmentBoard>(`/admin/processes/${processId}/assignments/`, payload)
    .then((r) => r.data)
