export interface CriterionScore {
  evaluator: string
  score: number
}

export interface CriterionSummary {
  name: string
  scores: CriterionScore[]
  average: number
}

export interface EvaluatorNote {
  evaluator: string
  text: string
}

export interface StageEvaluationSummary {
  stage: { id: string; name: string; order: number }
  criteria: CriterionSummary[]
  notes: EvaluatorNote[]
  stage_average: number | null
  needs_third_review: boolean
}

export interface EvaluationPayload {
  stage: string
  scores: { criterion: string; score: number }[]
  notes?: string
}
