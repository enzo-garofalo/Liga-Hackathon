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
<<<<<<< HEAD
=======
  /** Enunciado em PDF. Entra e sai por endpoint próprio, não pelo payload. */
  instructions_file_name: string
  instructions_file_url: string | null
>>>>>>> feature/v3-processo-seletivo
  order: number
  start_at: string | null
  end_at: string | null
  weight: number
<<<<<<< HEAD
=======
  /** Correção anônima desta etapa: o avaliador vê o código, não a pessoa. */
  anonymous_evaluation: boolean
>>>>>>> feature/v3-processo-seletivo
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
<<<<<<< HEAD
=======
  anonymous_evaluation?: boolean
>>>>>>> feature/v3-processo-seletivo
  accepts_late_submission?: boolean
  allows_file_upload?: boolean
  max_files?: number | null
  allowed_file_types?: string[]
  criteria?: EvaluationCriterion[]
}
