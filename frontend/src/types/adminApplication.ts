import type { ApplicationStatus, Deliverable } from './application'
import type { EvaluationCriterion } from './stage'

/** Linha da tabela de candidatos. */
export interface ApplicationRow {
  id: string
  /** Id do participante: o comunicado dirigido é endereçado por participante. */
  participant: string
  participant_name: string
  participant_email: string | null
  course: string
  semester: number
  current_stage: string | null
  current_stage_name: string | null
  status: ApplicationStatus
  final_score: number | null
  updated_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Ficha completa do candidato. Campos de identidade vêm nulos na correção anônima. */
export interface AdminApplicationDetail {
  id: string
  participant_name: string
  email: string | null
  course: string
  semester: number
  phone: string | null
  github: string | null
  linkedin: string | null
  bio: string | null
  status: ApplicationStatus
  current_stage: string | null
  current_stage_name: string | null
  deliverables: (Deliverable & { stage: string; stage_name: string; size: number | null })[]
  criteria: EvaluationCriterion[]
  my_scores: Record<string, number>
  final_score: number | null
  submitted_at: string | null
  updated_at: string
}

export interface ApplicationFilters {
  search?: string
  stage?: string
  status?: ApplicationStatus | ''
  course?: string
  ordering?: string
  page?: number
  /** Máximo aceito pelo backend: 200. */
  page_size?: number
}

export type BulkAction = 'move_stage' | 'approve' | 'reject' | 'discard'

export interface BulkActionPayload {
  applications: string[]
  action: BulkAction
  target_stage?: string
}

export interface OrganizerProfile {
  id: string
  email: string
  full_name: string
  role_title: string
  is_coordinator: boolean
  phone: string
  github: string
  linkedin: string
  updated_at: string
}
