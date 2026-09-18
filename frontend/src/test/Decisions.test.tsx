import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getApplication,
  listApplications,
  runBulkAction,
} from '../api/adminApplications'
import { CandidatesTab } from '../components/CandidatesTab'
import { makeApplicationDetail, makeProcessDetail, makeRow } from './fixtures'
import { renderWithProviders } from './render'

vi.mock('../api/adminApplications', () => ({
  listApplications: vi.fn(),
  getApplication: vi.fn(),
  getEvaluations: vi.fn(),
  saveEvaluation: vi.fn(),
  runBulkAction: vi.fn(),
}))
vi.mock('../api/communications', () => ({
  listCommunications: vi.fn(),
  getCommunication: vi.fn(),
  sendCommunication: vi.fn(),
}))
vi.mock('../api/applications', () => ({
  downloadDeliverable: vi.fn(),
  getMyApplications: vi.fn(),
  getMyApplication: vi.fn(),
  uploadDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
}))

const process = makeProcessDetail()
const inFirstStage = makeRow()
const inLastStage = makeRow({
  id: 'app-2',
  participant: 'part-2',
  participant_name: 'Bruno Reitano',
  current_stage: 'stage-2',
  current_stage_name: 'Entrevista',
})

function page(results = [inFirstStage, inLastStage]) {
  return { count: results.length, next: null, previous: null, results }
}

async function openProfile(name: string) {
  const row = screen.getByText(name).closest('tr') as HTMLElement
  await userEvent.click(within(row).getByRole('button', { name: 'Ver' }))
  return screen.findByRole('dialog')
}

describe('Decisão sobre o candidato', () => {
  beforeEach(() => {
    vi.mocked(listApplications).mockResolvedValue(page())
    vi.mocked(runBulkAction).mockResolvedValue({ updated: 1 })
    vi.mocked(getApplication).mockResolvedValue(makeApplicationDetail())
  })

  it('a ficha oferece aprovar e reprovar', async () => {
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')
    const dialog = await openProfile('Ana Lima')

    expect(within(dialog).getByRole('button', { name: /reprovar/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /aprovar/i })).toBeInTheDocument()
  })

  it('aprovar pede confirmação antes de agir', async () => {
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')
    const dialog = await openProfile('Ana Lima')

    await userEvent.click(within(dialog).getByRole('button', { name: /aprovar/i }))

    expect(
      await screen.findByText('Você tem certeza de aprovar o candidato?'),
    ).toBeInTheDocument()
    expect(runBulkAction).not.toHaveBeenCalled()
  })

  it('cancelar a confirmação não muda nada', async () => {
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')
    const dialog = await openProfile('Ana Lima')
    await userEvent.click(within(dialog).getByRole('button', { name: /reprovar/i }))

    await screen.findByText('Você tem certeza de reprovar o candidato?')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(
        screen.queryByText('Você tem certeza de reprovar o candidato?'),
      ).not.toBeInTheDocument(),
    )
    expect(runBulkAction).not.toHaveBeenCalled()
  })

  it('aprovar fora da última etapa avança para a próxima', async () => {
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')
    const dialog = await openProfile('Ana Lima')

    // O botão anuncia para onde o candidato vai.
    await userEvent.click(within(dialog).getByRole('button', { name: /aprovar para entrevista/i }))
    expect(await screen.findByText(/avança para a etapa Entrevista/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sim, aprovar' }))

    await waitFor(() =>
      expect(runBulkAction).toHaveBeenCalledWith('proc-1', {
        applications: ['app-1'],
        action: 'move_stage',
        target_stage: 'stage-2',
      }),
    )
  })

  it('aprovar na última etapa aprova no processo', async () => {
    vi.mocked(getApplication).mockResolvedValue(
      makeApplicationDetail({
        participant_name: 'Bruno Reitano',
        current_stage: 'stage-2',
        current_stage_name: 'Entrevista',
      }),
    )
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Bruno Reitano')
    const dialog = await openProfile('Bruno Reitano')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText(/última etapa/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sim, aprovar' }))

    await waitFor(() =>
      expect(runBulkAction).toHaveBeenCalledWith('proc-1', {
        applications: ['app-2'],
        action: 'approve',
      }),
    )
  })

  it('reprovar pela ficha encerra a candidatura', async () => {
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')
    const dialog = await openProfile('Ana Lima')

    await userEvent.click(within(dialog).getByRole('button', { name: /reprovar/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sim, reprovar' }))

    await waitFor(() =>
      expect(runBulkAction).toHaveBeenCalledWith('proc-1', {
        applications: ['app-1'],
        action: 'reject',
      }),
    )
  })

  it('ação em massa de reprovar também confirma', async () => {
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')

    await userEvent.click(screen.getByLabelText('Selecionar Ana Lima'))
    await userEvent.selectOptions(screen.getByDisplayValue('Ações...'), 'reject')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(
      await screen.findByText('Você tem certeza de reprovar o candidato?'),
    ).toBeInTheDocument()
    expect(runBulkAction).not.toHaveBeenCalled()
  })

  it('candidatura finalizada não oferece decisão', async () => {
    vi.mocked(getApplication).mockResolvedValue(
      makeApplicationDetail({ status: 'approved' }),
    )
    renderWithProviders(<CandidatesTab process={process} />)
    await screen.findByText('Ana Lima')
    const dialog = await openProfile('Ana Lima')

    expect(within(dialog).queryByRole('button', { name: /reprovar/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument()
  })
})
