import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyApplication } from '../api/applications'
import { ApplicationDetailPage } from '../pages/ApplicationDetailPage'
import type { ApplicationDetail, TimelineStage } from '../types/application'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/applications', () => ({
  getMyApplications: vi.fn(),
  getMyApplication: vi.fn(),
  uploadDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  downloadDeliverable: vi.fn(),
}))

function stage(overrides: Partial<TimelineStage>): TimelineStage {
  return {
    id: 'x',
    name: 'Etapa',
    description: '',
    order: 1,
    start_at: null,
    end_at: null,
    allows_file_upload: false,
    max_files: null,
    allowed_file_types: [],
    state: 'upcoming',
    deliverables: [],
    ...overrides,
  }
}

const application: ApplicationDetail = {
  id: 'app-1',
  process_id: 'proc-1',
  process_name: 'PS Liga 2026.2',
  status: 'in_progress',
  current_stage: 's2',
  current_stage_name: 'Resolução do Case',
  stage_count: 2,
  submitted_at: '2026-09-02T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z',
  highlight_message: '',
  stages: [
    stage({ id: 's1', name: 'Inscrição', order: 1, state: 'done' }),
    stage({
      id: 's2',
      name: 'Resolução do Case',
      order: 2,
      state: 'current',
      allows_file_upload: true,
      max_files: 1,
      allowed_file_types: ['pdf'],
    }),
  ],
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/applications/:id" element={<ApplicationDetailPage />} />
    </Routes>,
    { route: '/applications/app-1' },
  )
}

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getMyApplication).mockResolvedValue(application)
  })

  it('mostra o status e a área de entrega na etapa atual', async () => {
    renderPage()
    expect(await screen.findByText('Em andamento')).toBeInTheDocument()
    expect(screen.getByText('Sua entrega')).toBeInTheDocument()
  })

  it('etapa atual sem upload não mostra área de entrega', async () => {
    vi.mocked(getMyApplication).mockResolvedValue({
      ...application,
      stages: application.stages.map((s) =>
        s.state === 'current' ? { ...s, allows_file_upload: false } : s,
      ),
    })
    renderPage()

    expect(await screen.findByText('Em andamento')).toBeInTheDocument()
    expect(screen.queryByText('Sua entrega')).not.toBeInTheDocument()
  })

  it('candidatura finalizada não oferece entrega', async () => {
    vi.mocked(getMyApplication).mockResolvedValue({ ...application, status: 'rejected' })
    renderPage()

    expect(await screen.findByText('Não aprovado')).toBeInTheDocument()
    expect(screen.queryByText('Sua entrega')).not.toBeInTheDocument()
  })

  it('404 mostra "não encontrada"', async () => {
    vi.mocked(getMyApplication).mockRejectedValue(httpError(404))
    renderPage()
    expect(await screen.findByText('Candidatura não encontrada')).toBeInTheDocument()
  })

  it('erro de servidor NÃO diz "não encontrada"', async () => {
    vi.mocked(getMyApplication).mockRejectedValue(httpError(500))
    renderPage()

    expect(
      await screen.findByText('Não foi possível carregar sua candidatura'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Candidatura não encontrada')).not.toBeInTheDocument()
  })
})
