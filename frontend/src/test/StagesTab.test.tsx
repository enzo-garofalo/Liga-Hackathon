import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStage, deleteStage, listStages, updateStage } from '../api/stages'
import { StagesTab } from '../components/StagesTab'
import { listApplications } from '../api/adminApplications'
import { makeRow, makeStage } from './fixtures'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/stages', () => ({
  listStages: vi.fn(),
  createStage: vi.fn(),
  updateStage: vi.fn(),
  deleteStage: vi.fn(),
  reorderStages: vi.fn(),
}))
vi.mock('../api/adminApplications', () => ({
  listApplications: vi.fn(),
  getApplication: vi.fn(),
  getEvaluations: vi.fn(),
  saveEvaluation: vi.fn(),
  runBulkAction: vi.fn(),
}))

describe('StagesTab', () => {
  beforeEach(() => {
    vi.mocked(listStages).mockResolvedValue([makeStage()])
    vi.mocked(createStage).mockResolvedValue(makeStage())
    vi.mocked(updateStage).mockResolvedValue(makeStage())
    vi.mocked(deleteStage).mockResolvedValue(undefined)
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('mostra a etapa com participantes, peso e critérios', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    expect(await screen.findByText('Resolução do Case')).toBeInTheDocument()
    expect(screen.getByText('3 candidatos')).toBeInTheDocument()
    expect(screen.getByText('Peso na nota final: 35%')).toBeInTheDocument()
    expect(screen.getByText('2 critérios')).toBeInTheDocument()
    expect(screen.getByText('pdf')).toBeInTheDocument()
  })

  it('avisa quando não há etapa, porque publicar exige uma', async () => {
    vi.mocked(listStages).mockResolvedValue([])
    renderWithProviders(<StagesTab processId="proc-1" />)

    expect(await screen.findByText('Nenhuma etapa configurada')).toBeInTheDocument()
    expect(screen.getByText(/só pode ser publicado com ao menos uma etapa/)).toBeInTheDocument()
  })

  it('cria etapa com critérios e pesos', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')

    await userEvent.click(screen.getByRole('button', { name: /nova etapa/i }))
    await userEvent.type(screen.getByLabelText(/^nome/i), 'Pitch')
    await userEvent.click(screen.getByRole('button', { name: /adicionar critério/i }))
    await userEvent.type(screen.getByPlaceholderText('Pensamento crítico'), 'Comunicação')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(createStage).toHaveBeenCalledWith(
        'proc-1',
        expect.objectContaining({
          name: 'Pitch',
          criteria: [expect.objectContaining({ name: 'Comunicação', order: 1 })],
        }),
      ),
    )
  })

  it('avisa quando os pesos não somam 100', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.getByText(/Soma dos pesos: 100%/)).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Peso de Viabilidade'))
    await userEvent.type(screen.getByLabelText('Peso de Viabilidade'), '10')

    expect(screen.getByText(/precisa somar 100%/)).toBeInTheDocument()
  })

  it('tipos de arquivo só aparecem com upload ligado', async () => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ allows_file_upload: false, allowed_file_types: [] }),
    ])
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.queryByText('Tipos permitidos')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText(/permitir envio de arquivos/i))
    expect(screen.getByText('Tipos permitidos')).toBeInTheDocument()
  })

  it('mostra o motivo quando o backend recusa a exclusão', async () => {
    vi.mocked(deleteStage).mockRejectedValue(
      httpError(400, ['Há candidatos nesta etapa. Mova-os antes de excluí-la.']),
    )
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')

    await userEvent.click(screen.getByLabelText('Excluir Resolução do Case'))

    expect(
      await screen.findByText('Há candidatos nesta etapa. Mova-os antes de excluí-la.'),
    ).toBeInTheDocument()
  })
})

describe('StagesTab — quem está em cada etapa', () => {
  beforeEach(() => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ participant_count: 2 }),
      makeStage({ id: 'stage-2', name: 'Entrevista', order: 2, participant_count: 1 }),
    ])
    vi.mocked(listApplications).mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: [
        makeRow({ id: 'a1', participant_name: 'Ana Lima', current_stage: 'stage-1' }),
        makeRow({ id: 'a2', participant_name: 'João Silva', current_stage: 'stage-1' }),
        makeRow({ id: 'a3', participant_name: 'Bruno Reitano', current_stage: 'stage-2' }),
      ],
    })
  })

  it('mostra o nome de quem está em cada etapa, não só o total', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)

    const caseCard = (await screen.findByText('Resolução do Case')).closest(
      'div.dark-card',
    ) as HTMLElement
    expect(within(caseCard).getByText('2 candidatos')).toBeInTheDocument()
    expect(within(caseCard).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(caseCard).getByText('João Silva')).toBeInTheDocument()
    expect(within(caseCard).queryByText('Bruno Reitano')).not.toBeInTheDocument()

    const interviewCard = screen.getByText('Entrevista').closest('div.dark-card') as HTMLElement
    expect(within(interviewCard).getByText('Bruno Reitano')).toBeInTheDocument()
  })

  it('pede a lista inteira, não só a primeira página', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Ana Lima')

    expect(listApplications).toHaveBeenCalledWith(
      'proc-1',
      expect.objectContaining({ page_size: 200 }),
    )
  })

  it('etapa vazia não lista ninguém', async () => {
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    renderWithProviders(<StagesTab processId="proc-1" />)

    const caseCard = (await screen.findByText('Resolução do Case')).closest(
      'div.dark-card',
    ) as HTMLElement
    expect(within(caseCard).queryByRole('list')).not.toBeInTheDocument()
  })
})
