/** Organizador que o coordenador chamou para um processo. */
export interface ProcessOrganizer {
  id: string
  user_id: number
  email: string
  full_name: string
  role_title: string
  /** Coordenador do processo: conduz, decide e distribui. */
  is_coordinator: boolean
  /** Convidado que ainda não criou a senha, então ainda não entrou nenhuma vez. */
  pending: boolean
  /** Quantas correções esta pessoa tem neste processo, somando as etapas. */
  workload: number
  created_at: string
}

export interface OrganizerInvitePayload {
  email: string
  full_name?: string
  role_title?: string
}

export interface StageAssignmentRow {
  application: string
  code: string
  evaluator: string
}

export interface StageAssignments {
  /** Correções por avaliador nesta etapa, indexado pelo login. */
  workload: Record<string, number>
  assignments: StageAssignmentRow[]
}

export interface AutoDistributePayload {
  evaluators: number[]
  per_application: number
}

export interface AutoDistributeResult {
  created: number
  workload: Record<string, number>
}

/** Um candidato no quadro de distribuição, já com quem o corrige. */
export interface BoardCandidate {
  application: string
  name: string
  code: string
  status: string
  /** Ids dos organizadores que corrigem este candidato nesta etapa. */
  evaluators: number[]
}

export interface BoardStage {
  id: string
  name: string
  order: number
  anonymous_evaluation: boolean
  candidates: BoardCandidate[]
}

export interface AssignmentBoard {
  stages: BoardStage[]
  /** Correções por organizador no processo inteiro, indexado pelo id. */
  workload: Record<string, number>
}

export interface SetEvaluatorsPayload {
  application: string
  evaluators: number[]
  stages: string[]
}
