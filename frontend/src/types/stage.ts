export interface EvaluationCriterion {
  id?: string
  name: string
  order: number
  weight: number
}

export interface Stage {
  id: string
  name: string
  description: string
  /** Texto longo do que fazer na etapa. Vazio quando o candidato ainda não chegou nela. */
  instructions: string
  order: number
  start_at: string | null
  end_at: string | null
  weight: number
  accepts_late_submission: boolean
  allows_file_upload: boolean
  max_files: number | null
  allowed_file_types: string[]
  criteria: EvaluationCriterion[]
  participant_count: number
}

export interface StagePayload {
  name: string
  description?: string
  instructions?: string
  start_at?: string | null
  end_at?: string | null
  weight?: number
  accepts_late_submission?: boolean
  allows_file_upload?: boolean
  max_files?: number | null
  allowed_file_types?: string[]
  criteria?: EvaluationCriterion[]
}
