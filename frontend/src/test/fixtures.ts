import type { AdminApplicationDetail, ApplicationRow } from '../types/adminApplication'
import type { AdminProcess, AdminProcessDetail } from '../types/adminProcess'
import type { Stage } from '../types/stage'

export function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 'stage-1',
    name: 'Resolução do Case',
    description: '',
    instructions: '',
    order: 1,
    start_at: null,
    end_at: null,
    weight: 35,
    accepts_late_submission: false,
    allows_file_upload: true,
    max_files: 1,
    allowed_file_types: ['pdf'],
    criteria: [
      { id: 'c1', name: 'Pensamento crítico', order: 1, weight: 60 },
      { id: 'c2', name: 'Viabilidade', order: 2, weight: 40 },
    ],
    participant_count: 3,
    ...overrides,
  }
}

export function makeProcess(overrides: Partial<AdminProcess> = {}): AdminProcess {
  return {
    id: 'proc-1',
    name: 'PS Liga 2026.2',
    description: 'Venha para a Liga.',
    banner: null,
    status: 'published',
    registration_start: '2026-08-01T12:00:00Z',
    registration_end: '2026-08-15T12:00:00Z',
    published_at: '2026-08-01T12:00:00Z',
    highlight_message: '',
    score_min: 1,
    score_max: 5,
    divergence_threshold: '1.50',
    anonymous_evaluation: true,
    application_count: 7,
    stage_count: 2,
    created_at: '2026-07-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    ...overrides,
  }
}

export function makeProcessDetail(
  overrides: Partial<AdminProcessDetail> = {},
): AdminProcessDetail {
  return {
    ...makeProcess(),
    stats: { total: 7, in_progress: 5, approved: 1, rejected: 1, discarded: 0 },
    stages: [
      makeStage(),
      makeStage({ id: 'stage-2', name: 'Entrevista', order: 2, criteria: [] }),
    ],
    ...overrides,
  }
}

export function makeRow(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: 'app-1',
    participant: 'part-1',
    participant_name: 'Ana Lima',
    participant_email: 'ana@aluno.dev',
    course: 'CC',
    semester: 4,
    current_stage: 'stage-1',
    current_stage_name: 'Resolução do Case',
    status: 'in_progress',
    final_score: 4.47,
    updated_at: '2026-09-10T12:00:00Z',
    ...overrides,
  }
}

export function makeApplicationDetail(
  overrides: Partial<AdminApplicationDetail> = {},
): AdminApplicationDetail {
  return {
    id: 'app-1',
    participant_name: 'Ana Lima',
    email: 'ana@aluno.dev',
    course: 'CC',
    semester: 4,
    phone: '(19) 99999-0000',
    github: 'https://github.com/ana',
    linkedin: null,
    bio: 'Bio.',
    status: 'in_progress',
    current_stage: 'stage-1',
    current_stage_name: 'Resolução do Case',
    deliverables: [],
    criteria: [
      { id: 'c1', name: 'Pensamento crítico', order: 1, weight: 60 },
      { id: 'c2', name: 'Viabilidade', order: 2, weight: 40 },
    ],
    my_scores: {},
    final_score: 4.47,
    submitted_at: '2026-08-02T12:00:00Z',
    updated_at: '2026-09-10T12:00:00Z',
    ...overrides,
  }
}
