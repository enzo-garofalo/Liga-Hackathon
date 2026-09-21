import type { PublicStage } from './process'

export type ApplicationStatus =
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'discarded'
<<<<<<< HEAD
=======
  /** Desistência do próprio candidato, durante o período de inscrição. */
  | 'withdrawn'
>>>>>>> feature/v3-processo-seletivo

export type StageState = 'done' | 'current' | 'upcoming'

export interface Deliverable {
  id: string
  filename: string
  download_url: string
  uploaded_at: string
}

export interface TimelineStage extends PublicStage {
  allows_file_upload: boolean
  max_files: number | null
  allowed_file_types: string[]
  state: StageState
  deliverables: Deliverable[]
  /** Vem vazio enquanto o candidato não chega na etapa. */
  instructions: string
<<<<<<< HEAD
=======
  /** Enunciado em PDF. Vem nulo enquanto o candidato não chega na etapa. */
  instructions_file: { filename: string; download_url: string } | null
>>>>>>> feature/v3-processo-seletivo
}

export interface ApplicationSummary {
  id: string
  process_id: string
  process_name: string
  status: ApplicationStatus
  current_stage: string | null
  current_stage_name: string | null
  stage_count: number
  submitted_at: string | null
  updated_at: string
<<<<<<< HEAD
=======
  /**
   * Se dá para cancelar a inscrição agora. Quem decide é o backend: a regra
   * depende do prazo do processo, que esta lista não traz.
   */
  can_withdraw: boolean
>>>>>>> feature/v3-processo-seletivo
}

export interface ApplicationDetail extends ApplicationSummary {
  stages: TimelineStage[]
  highlight_message: string
}
