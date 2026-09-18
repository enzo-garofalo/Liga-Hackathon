import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getApplication, saveEvaluation } from '../api/adminApplications'
import { CandidateProfileModal } from '../components/CandidateProfileModal'
import { makeApplicationDetail } from './fixtures'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/adminApplications', () => ({
  listApplications: vi.fn(),
  getApplication: vi.fn(),
  getEvaluations: vi.fn(),
  saveEvaluation: vi.fn(),
  runBulkAction: vi.fn(),
}))
vi.mock('../api/applications', () => ({
  downloadDeliverable: vi.fn(),
  getMyApplications: vi.fn(),
  getMyApplication: vi.fn(),
  uploadDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
}))

function render(props = {}) {
  return renderWithProviders(
    <CandidateProfileModal
      applicationId="app-1"
      scaleMin={1}
      scaleMax={5}
      onClose={() => {}}
      {...props}
    />,
  )
}

describe('CandidateProfileModal', () => {
  beforeEach(() => {
    vi.mocked(getApplication).mockResolvedValue(makeApplicationDetail())
    vi.mocked(saveEvaluation).mockResolvedValue([])
  })

  it('os critérios vêm da configuração da etapa', async () => {
    render()
    expect(await screen.findByText('Pensamento crítico')).toBeInTheDocument()
    expect(screen.getByText('Viabilidade')).toBeInTheDocument()
    expect(screen.getByText('peso 60%')).toBeInTheDocument()
    expect(screen.getByText(/escala 1 a 5/)).toBeInTheDocument()
  })

  it('envia as notas e a observação', async () => {
    render()
    await screen.findByText('Pensamento crítico')

    await userEvent.type(screen.getByLabelText('Nota de Pensamento crítico'), '5')
    await userEvent.type(screen.getByLabelText('Nota de Viabilidade'), '3')
    await userEvent.type(screen.getByLabelText(/observações/i), 'Justificou bem.')
    await userEvent.click(screen.getByRole('button', { name: /salvar avaliação/i }))

    await waitFor(() =>
      expect(saveEvaluation).toHaveBeenCalledWith('app-1', {
        stage: 'stage-1',
        scores: [
          { criterion: 'c1', score: 5 },
          { criterion: 'c2', score: 3 },
        ],
        notes: 'Justificou bem.',
      }),
    )
  })

  it('pré-carrega as notas que o avaliador já deu', async () => {
    vi.mocked(getApplication).mockResolvedValue(
      makeApplicationDetail({ my_scores: { c1: 4, c2: 2 } }),
    )
    render()

    expect(await screen.findByLabelText('Nota de Pensamento crítico')).toHaveValue('4')
    expect(screen.getByLabelText('Nota de Viabilidade')).toHaveValue('2')
  })

  it('não envia sem nenhuma nota preenchida', async () => {
    render()
    await screen.findByText('Pensamento crítico')
    await userEvent.click(screen.getByRole('button', { name: /salvar avaliação/i }))

    expect(await screen.findByText('Informe ao menos uma nota.')).toBeInTheDocument()
    expect(saveEvaluation).not.toHaveBeenCalled()
  })

  it('na correção anônima, mostra código e esconde identidade', async () => {
    vi.mocked(getApplication).mockResolvedValue(
      makeApplicationDetail({
        participant_name: 'C-0001',
        email: null,
        phone: null,
        github: null,
        linkedin: null,
      }),
    )
    render()

    expect(await screen.findByText('C-0001')).toBeInTheDocument()
    expect(screen.queryByText('ana@aluno.dev')).not.toBeInTheDocument()
    expect(screen.getByText(/Correção anônima/)).toBeInTheDocument()
  })

  it('nota fora da escala nem chega a ser enviada', async () => {
    render()
    await screen.findByText('Pensamento crítico')

    await userEvent.type(screen.getByLabelText('Nota de Pensamento crítico'), '9')
    await userEvent.click(screen.getByRole('button', { name: /salvar avaliação/i }))

    expect(await screen.findByText(/Nota fora da escala/)).toBeInTheDocument()
    expect(saveEvaluation).not.toHaveBeenCalled()
  })

  it('mostra o motivo quando o backend recusa a nota', async () => {
    vi.mocked(saveEvaluation).mockRejectedValue(
      httpError(400, ['Processo encerrado não aceita novas avaliações.']),
    )
    render()
    await screen.findByText('Pensamento crítico')

    await userEvent.type(screen.getByLabelText('Nota de Pensamento crítico'), '4')
    await userEvent.click(screen.getByRole('button', { name: /salvar avaliação/i }))

    expect(
      await screen.findByText('Processo encerrado não aceita novas avaliações.'),
    ).toBeInTheDocument()
  })

  it('etapa sem critérios não oferece avaliação', async () => {
    vi.mocked(getApplication).mockResolvedValue(makeApplicationDetail({ criteria: [] }))
    render()

    expect(await screen.findByText(/não tem critérios configurados/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /salvar avaliação/i }),
    ).not.toBeInTheDocument()
  })
})
