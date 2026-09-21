import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  autoDistribute,
  getAssignmentBoard,
  getStageAssignments,
  inviteOrganizer,
  listProcessOrganizers,
  removeOrganizer,
  resendOrganizerInvite,
  setEvaluators,
} from '../api/organizers'
import type {
  AssignmentBoard,
  AutoDistributePayload,
  OrganizerInvitePayload,
  SetEvaluatorsPayload,
} from '../types/organizer'
import { retryUnlessClientError } from '../utils/errors'

const chave = (processId: string | undefined) => ['process-organizers', processId]

export function useProcessOrganizers(processId: string | undefined) {
  return useQuery({
    queryKey: chave(processId),
    queryFn: () => listProcessOrganizers(processId as string),
    enabled: Boolean(processId),
    retry: retryUnlessClientError,
  })
}

export function useInviteOrganizer(processId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OrganizerInvitePayload) =>
      inviteOrganizer(processId as string, payload),
    onSuccess: (lista) => {
      queryClient.setQueryData(chave(processId), lista)
    },
  })
}

export function useRemoveOrganizer(processId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => removeOrganizer(processId as string, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chave(processId) })
      // A pessoa perdeu as designações dela: a carga de trabalho mudou.
      queryClient.invalidateQueries({ queryKey: ['stage-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assignment-board'] })
    },
  })
}

export function useResendOrganizerInvite(processId: string | undefined) {
  return useMutation({
    mutationFn: (userId: number) =>
      resendOrganizerInvite(processId as string, userId),
  })
}

export function useStageAssignments(stageId: string | undefined) {
  return useQuery({
    queryKey: ['stage-assignments', stageId],
    queryFn: () => getStageAssignments(stageId as string),
    enabled: Boolean(stageId),
    retry: retryUnlessClientError,
  })
}

export function useAutoDistribute(stageId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AutoDistributePayload) =>
      autoDistribute(stageId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-assignments', stageId] })
      queryClient.invalidateQueries({ queryKey: ['process-organizers'] })
      queryClient.invalidateQueries({ queryKey: ['assignment-board'] })
    },
  })
}

const chaveDoQuadro = (processId: string | undefined) => [
  'assignment-board',
  processId,
]

export function useAssignmentBoard(processId: string | undefined) {
  return useQuery({
    queryKey: chaveDoQuadro(processId),
    queryFn: () => getAssignmentBoard(processId as string),
    enabled: Boolean(processId),
    retry: retryUnlessClientError,
  })
}

export function useSetEvaluators(processId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SetEvaluatorsPayload) =>
      setEvaluators(processId as string, payload),
    onSuccess: (quadro: AssignmentBoard) => {
      // A resposta já traz o quadro inteiro: redesenhar não custa outra volta.
      queryClient.setQueryData(chaveDoQuadro(processId), quadro)
      queryClient.invalidateQueries({ queryKey: ['process-organizers', processId] })
    },
  })
}
