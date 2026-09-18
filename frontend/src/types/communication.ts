export type CommunicationType = 'auto' | 'manual'
export type CommunicationAudience =
  | 'all'
  | 'stage'
  | 'approved'
  | 'rejected'
  | 'specific'

export interface Communication {
  id: string
  type: CommunicationType
  subject: string
  audience: CommunicationAudience
  audience_stage: string | null
  audience_stage_name: string | null
  recipient_count: number
  status: 'sent' | 'failed'
  sent_at: string
}

export interface CommunicationDetail extends Communication {
  message: string
  recipients: { id: string; full_name: string }[]
}

export interface CommunicationPayload {
  audience: CommunicationAudience
  audience_stage?: string | null
  recipients?: string[]
  subject: string
  message: string
}
