import type { ProcessStatus } from './process'
import type { Stage } from './stage'

export interface ProcessStats {
  total: number
  in_progress: number
  approved: number
  rejected: number
  discarded: number
}

export interface AdminProcess {
  id: string
  name: string
  description: string
  banner: string | null
  status: ProcessStatus
  registration_start: string
  registration_end: string
  published_at: string | null
  highlight_message: string
  score_min: number
  score_max: number
  divergence_threshold: string
  anonymous_evaluation: boolean
  application_count: number
  stage_count: number
  created_at: string
  updated_at: string
}

export interface AdminProcessDetail extends AdminProcess {
  stats: ProcessStats
  stages: Stage[]
}

export interface ProcessPayload {
  name: string
  description?: string
  registration_start: string
  registration_end: string
  status?: ProcessStatus
}

export interface PublishPayload {
  registration_start?: string
  registration_end?: string
  highlight_message?: string
}
