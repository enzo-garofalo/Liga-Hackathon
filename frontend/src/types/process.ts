export type ProcessStatus = 'draft' | 'published' | 'closed'

export interface ProcessSummary {
  id: string
  name: string
  short_description: string
  banner: string | null
  registration_start: string
  registration_end: string
  registration_open: boolean
  stage_count: number
  already_applied: boolean
}

export interface PublicStage {
  id: string
  name: string
  description: string
  order: number
  start_at: string | null
  end_at: string | null
}

export interface ProcessDetail extends ProcessSummary {
  description: string
  highlight_message: string
  stages: PublicStage[]
}
