/**
 * Distribuir correções, no desenho que mostra gente antes de pedir número.
 *
 * A versão anterior pedia etapa e quantidade antes de exibir um candidato, e o
 * coordenador distribuía no escuro. Estes testes prendem o contrário disso.
 */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { autoDistribute, getAssignmentBoard, setEvaluators } from '../api/organizers'
import { DistribuicaoTab } from '../components/DistribuicaoTab'
import type { AssignmentBoard } from '../types/organizer'
import { makeOrganizer, makeProcessDetail, makeStage } from './fixtures'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/organizers', () => ({
  listProcessOrganizers: vi.fn(),
  inviteOrganizer: vi.fn(),
  resendOrganizerInvite: vi.fn(),
  removeOrganizer: vi.fn(),
  getStageAssignments: vi.fn(),
  autoDistribute: vi.fn(),
  getAssignmentBoard: vi.fn(),
  setEvaluators: vi.fn(),
}))

const process = makeProcessDetail({
  stages: [
    makeStage({ id: 'stage-1', name: 'Resolução do Case', order: 1 }),
    makeStage({ id: 'stage-2', name: 'Entrevista', order: 2, criteria: [] }),
  ],
})

const bruno = makeOrganizer()
const ana = makeOrganizer({
  id: 'org-2',
  user_id: 8,
  email: 'ana@ligadeti.com.br',
  full_name: 'Ana Souza',
  is_coordinator: false,
  pending: false,
})

const quadro: AssignmentBoard = {
  stages: [
    {
      id: 'stage-1',
      name: 'Resolução do Case',
      order: 1,
      anonymous_evaluation: true,
      candidates: [
        {
          application: 'app-1',
          name: 'Carla Dias',
          code: 'C-0001',
          status: 'in_progress',
          evaluators: [8],
        },
        {
          application: 'app-2',
          name: 'Diego Melo',
          code: 'C-0002',
          status: 'in_progress',
          evaluators: [],
        },
      ],
    },
    {
      id: 'stage-2',
      name: 'Entrevista',
      order: 2,
      anonymous_evaluation: false,
      candidates: [],
    },
  ],
  workload: { '8': 1 },
}

function render() {
  return renderWithProviders(
    <DistribuicaoTab process={process} membros={[bruno, ana]} />,
  )
}

describe('DistribuicaoTab', () => {
  beforeEach(() => {
    vi.mocked(getAssignmentBoard).mockResolvedValue(quadro)
    vi.mocked(setEvaluators).mockResolvedValue(quadro)
    vi.mocked(autoDistribute).mockResolvedValue({ created: 4, workload: {} })
  })

  it('mostra os candidatos agrupados por fase', async () => {
    render()

    expect(await screen.findByText('1. Resolução do Case')).toBeInTheDocument()
    expect(screen.getByText('2. Entrevista')).toBeInTheDocument()
    expect(screen.getByText('Carla Dias')).toBeInTheDocument()
    expect(screen.getByText('Diego Melo')).toBeInTheDocument()
  })

  it('diz quem corrige cada um, e quem está sem ninguém', async () => {
    render()
    await screen.findByText('Carla Dias')

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Sem avaliador')).toBeInTheDocument()
  })

  it('a fase vazia diz que está vazia, em vez de sumir', async () => {
    render()
    await screen.findByText('2. Entrevista')

    expect(screen.getByText(/ninguém nesta fase agora/i)).toBeInTheDocument()
  })

  it('não oferece distribuir automaticamente uma fase sem ninguém', async () => {
    render()
    await screen.findByText('2. Entrevista')

    // Só a fase do case tem candidato, então só ela tem o botão.
    expect(
      screen.getAllByRole('button', { name: /distribuir automaticamente/i }),
    ).toHaveLength(1)
  })

  // ── Escolha manual ──────────────────────────────────────────────

  it('o modal do candidato já vem com quem corrige ele marcado', async () => {
    render()
    await screen.findByText('Carla Dias')

    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )

    expect(await screen.findByText(/avaliadores de carla dias/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /ana souza/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /bruno alves/i })).not.toBeChecked()
  })

  it('começa marcando só a etapa em que o candidato está', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )
    await screen.findByText(/avaliadores de carla dias/i)

    expect(screen.getByRole('checkbox', { name: /1\. resolução do case/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /2\. entrevista/i })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /todas as etapas/i })).not.toBeChecked()
  })

  it('"todas as etapas" marca todas de uma vez', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )
    await screen.findByText(/avaliadores de carla dias/i)

    await userEvent.click(screen.getByRole('checkbox', { name: /todas as etapas/i }))

    expect(screen.getByRole('checkbox', { name: /1\. resolução do case/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /2\. entrevista/i })).toBeChecked()
  })

  it('salva os avaliadores nas etapas marcadas', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )
    await screen.findByText(/avaliadores de carla dias/i)

    await userEvent.click(screen.getByRole('checkbox', { name: /bruno alves/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /todas as etapas/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(setEvaluators).toHaveBeenCalledWith(process.id, {
        application: 'app-1',
        evaluators: [8, 7],
        stages: ['stage-1', 'stage-2'],
      }),
    )
  })

  it('deixa tirar todo mundo de um candidato', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )
    await screen.findByText(/avaliadores de carla dias/i)

    await userEvent.click(screen.getByRole('checkbox', { name: /ana souza/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(setEvaluators).toHaveBeenCalledWith(process.id, {
        application: 'app-1',
        evaluators: [],
        stages: ['stage-1'],
      }),
    )
  })

  it('sem etapa marcada não deixa salvar', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )
    await screen.findByText(/avaliadores de carla dias/i)

    await userEvent.click(
      screen.getByRole('checkbox', { name: /1\. resolução do case/i }),
    )

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByText(/marque ao menos uma etapa/i)).toBeInTheDocument()
  })

  it('mostra o motivo quando a API recusa', async () => {
    vi.mocked(setEvaluators).mockRejectedValue(
      httpError(400, { detail: 'Esta pessoa não faz parte deste processo.' }),
    )
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getAllByRole('button', { name: /escolher avaliadores/i })[0],
    )
    await screen.findByText(/avaliadores de carla dias/i)

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('Esta pessoa não faz parte deste processo.'),
    ).toBeInTheDocument()
  })

  // ── Automático por fase ─────────────────────────────────────────

  it('o automático abre já dizendo quantos candidatos a fase tem', async () => {
    render()
    await screen.findByText('Carla Dias')

    await userEvent.click(
      screen.getByRole('button', { name: /distribuir automaticamente/i }),
    )

    expect(
      await screen.findByText(/distribuir resolução do case/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/2 candidatos em andamento nesta fase/i)).toBeInTheDocument()
  })

  it('distribui a fase entre quem foi marcado', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getByRole('button', { name: /distribuir automaticamente/i }),
    )
    await screen.findByText(/distribuir resolução do case/i)

    // A coordenação entra desmarcada; marcar o Bruno completa os dois.
    await userEvent.click(screen.getByRole('checkbox', { name: /bruno alves/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Distribuir' }))

    await waitFor(() =>
      expect(autoDistribute).toHaveBeenCalledWith('stage-1', {
        evaluators: [7, 8],
        per_application: 2,
      }),
    )
    expect(await screen.findByText(/4 correções distribuídas/i)).toBeInTheDocument()
  })

  it('não distribui mais correções do que há gente para fazer', async () => {
    render()
    await screen.findByText('Carla Dias')
    await userEvent.click(
      screen.getByRole('button', { name: /distribuir automaticamente/i }),
    )
    await screen.findByText(/distribuir resolução do case/i)

    // Só a Ana marcada, e o padrão é 2 por candidato.
    expect(screen.getByRole('button', { name: 'Distribuir' })).toBeDisabled()
    expect(screen.getByText(/marque ao menos 2 organizadores/i)).toBeInTheDocument()
  })
})
