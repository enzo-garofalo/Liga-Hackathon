import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listApplications, runBulkAction } from '../api/adminApplications'
import { sendCommunication } from '../api/communications'
import { CandidatesTab } from '../components/CandidatesTab'
import { makeProcessDetail, makeRow } from './fixtures'
import { httpError } from './http'
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

const process = makeProcessDetail()
const inFirstStage = makeRow()
const inLastStage = makeRow({
  id: 'app-2',
  participant: 'part-2',
  participant_name: 'Bruno Reitano',
  current_stage: 'stage-2',
  current_stage_name: 'Entrevista',
  final_score: null,
})

function page(results = [inFirstStage, inLastStage]) {
  return { count: results.length, next: null, previous: null, results }
}

async function selectRow(name: string) {
  await userEvent.click(screen.getByLabelText(`Selecionar ${name}`))
}

describe('CandidatesTab', () => {
  beforeEach(() => {
    vi.mocked(listApplications).mockResolvedValue(page())
    vi.mocked(runBulkAction).mockResolvedValue({ updated: 1 })
  })

  it('mostra a nota final de quem foi avaliado', async () => {
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    expect(await screen.findByText('4,47')).toBeInTheDocument()
    // Sem avaliação, a coluna fica vazia em vez de mostrar zero.
    const bruno = screen.getByText('Bruno Reitano').closest('tr') as HTMLElement
    expect(within(bruno).getByText('—')).toBeInTheDocument()
  })

  it('o menu de ações só aparece com alguém selecionado', async () => {
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Ana Lima')
    expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument()

    await selectRow('Ana Lima')
    expect(screen.getByText('1 candidato selecionado')).toBeInTheDocument()
  })

  it('aprovar fica desabilitado fora da última etapa', async () => {
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Ana Lima')
    await selectRow('Ana Lima')

    const approve = screen.getByRole('option', { name: /aprovar/i }) as HTMLOptionElement
    expect(approve.disabled).toBe(true)
    expect(approve.textContent).toMatch(/só na última etapa/i)
  })

  it('aprovar libera para quem está na última etapa', async () => {
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Bruno Reitano')
    await selectRow('Bruno Reitano')

    const approve = screen.getByRole('option', { name: /aprovar/i }) as HTMLOptionElement
    expect(approve.disabled).toBe(false)
  })

  it('mover etapa exige escolher o destino antes de aplicar', async () => {
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Ana Lima')
    await selectRow('Ana Lima')

    await userEvent.selectOptions(screen.getByDisplayValue('Ações...'), 'move_stage')
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()

    await userEvent.selectOptions(
      screen.getByDisplayValue('Etapa de destino...'),
      'stage-2',
    )
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeEnabled()
  })

  it('aplica a ação em massa nos selecionados', async () => {
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Ana Lima')
    await selectRow('Ana Lima')

    await userEvent.selectOptions(screen.getByDisplayValue('Ações...'), 'reject')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    // Reprovar dispara e-mail e encerra a candidatura: confirma antes.
    await userEvent.click(await screen.findByRole('button', { name: 'Sim, reprovar' }))

    await waitFor(() =>
      expect(runBulkAction).toHaveBeenCalledWith('proc-1', {
        applications: ['app-1'],
        action: 'reject',
      }),
    )
  })

  it('mostra o motivo quando o backend recusa a ação', async () => {
    vi.mocked(runBulkAction).mockRejectedValue(
      httpError(400, ['A aprovação final só é permitida na última etapa.']),
    )
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Ana Lima')
    await selectRow('Ana Lima')

    await userEvent.selectOptions(screen.getByDisplayValue('Ações...'), 'reject')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sim, reprovar' }))

    expect(
      await screen.findByText('A aprovação final só é permitida na última etapa.'),
    ).toBeInTheDocument()
  })

  it('"Enviar comunicado" endereça os selecionados por participante', async () => {
    vi.mocked(sendCommunication).mockResolvedValue({
      id: 'comm-1',
      type: 'manual',
      subject: 'Aviso',
      audience: 'specific',
      audience_stage: null,
      audience_stage_name: null,
      recipient_count: 1,
      status: 'sent',
      sent_at: '2026-09-16T12:00:00Z',
      message: 'Olá',
      recipients: [],
    })

<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo
    await screen.findByText('Ana Lima')
    await selectRow('Ana Lima')

    await userEvent.selectOptions(screen.getByDisplayValue('Ações...'), 'communicate')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    // O modal abre já dirigido, sem pedir destinatário de novo.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/1 candidato selecionado: Ana Lima/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/assunto/i), 'Aviso')
    await userEvent.type(screen.getByLabelText(/mensagem/i), 'Recado para a turma')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() =>
      expect(sendCommunication).toHaveBeenCalledWith(
        'proc-1',
        expect.objectContaining({ audience: 'specific', recipients: ['part-1'] }),
      ),
    )
  })

  it('erro de API mostra aviso em vez de tabela vazia', async () => {
    vi.mocked(listApplications).mockRejectedValue(httpError(500))
<<<<<<< HEAD
    renderWithProviders(<CandidatesTab process={process} />)
=======
    renderWithProviders(<CandidatesTab process={process} canDecide />)
>>>>>>> feature/v3-processo-seletivo

    expect(
      await screen.findByText('Não foi possível carregar os candidatos'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nenhum candidato neste filtro')).not.toBeInTheDocument()
  })
})
