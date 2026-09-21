/**
 * O que cada cargo enxerga na área do organizador.
 *
 * O backend já recusa as rotas do coordenador para o avaliador. Estes testes
 * cobrem a outra metade: a tela não oferecer porta trancada, e não pedir ao
 * avaliador que escolha candidatos para uma ação que ele não tem.
 */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getApplication,
  getEvaluations,
  listApplications,
} from '../api/adminApplications'
import { getOrganizerProfile, getProcess } from '../api/adminProcesses'
import { listCommunications } from '../api/communications'
import { listProcessOrganizers } from '../api/organizers'
import { listStages } from '../api/stages'
import { CandidateProfileModal } from '../components/CandidateProfileModal'
import { CandidatesTab } from '../components/CandidatesTab'
import { ManageProcessPage } from '../pages/ManageProcessPage'
import {
  makeApplicationDetail,
  makeOrganizerProfile,
  makeProcessDetail,
  makeRow,
} from './fixtures'
import { renderWithProviders } from './render'

vi.mock('../api/adminProcesses', () => ({
  listProcesses: vi.fn(),
  getProcess: vi.fn(),
  createProcess: vi.fn(),
  updateProcess: vi.fn(),
  deleteProcess: vi.fn(),
  publishProcess: vi.fn(),
  closeProcess: vi.fn(),
  getOrganizerProfile: vi.fn(),
  updateOrganizerProfile: vi.fn(),
}))
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
vi.mock('../api/stages', () => ({
  listStages: vi.fn(),
  createStage: vi.fn(),
  updateStage: vi.fn(),
  deleteStage: vi.fn(),
  reorderStages: vi.fn(),
}))
vi.mock('../api/organizers', () => ({
  listProcessOrganizers: vi.fn(),
  inviteOrganizer: vi.fn(),
  resendOrganizerInvite: vi.fn(),
  removeOrganizer: vi.fn(),
  getStageAssignments: vi.fn(),
  autoDistribute: vi.fn(),
}))
vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn(),
  markAsRead: vi.fn(),
}))

const process = makeProcessDetail()
const linha = makeRow()

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/processes/:id" element={<ManageProcessPage />} />
    </Routes>,
    { route: `/admin/processes/${process.id}` },
  )
}

function comCargo(coordena: boolean) {
  vi.mocked(getOrganizerProfile).mockResolvedValue(
    makeOrganizerProfile({ is_coordinator: coordena }),
  )
}

describe('A tela do organizador muda com o cargo', () => {
  beforeEach(() => {
    vi.mocked(getProcess).mockResolvedValue(process)
    vi.mocked(listStages).mockResolvedValue(process.stages)
    vi.mocked(listCommunications).mockResolvedValue([])
    vi.mocked(listProcessOrganizers).mockResolvedValue([])
    vi.mocked(listApplications).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [linha],
    })
  })

  it('o coordenador vê as quatro abas', async () => {
    comCargo(true)
    renderPage()
    await screen.findByText('PS Liga 2026.2')

    expect(screen.getByRole('button', { name: 'Candidatos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Etapas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comunicações' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Organizadores' })).toBeInTheDocument()
  })

  it('o avaliador vê só a aba de candidatos', async () => {
    comCargo(false)
    renderPage()
    await screen.findByText('PS Liga 2026.2')

    expect(screen.getByRole('button', { name: 'Candidatos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Etapas' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Comunicações' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Organizadores' }),
    ).not.toBeInTheDocument()
  })

  it('o avaliador não pode editar, publicar nem encerrar o processo', async () => {
    comCargo(false)
    renderPage()
    await screen.findByText('PS Liga 2026.2')

    expect(
      screen.queryByRole('button', { name: /editar processo/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /encerrar processo/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /abrir inscrições/i }),
    ).not.toBeInTheDocument()
  })

  it('o coordenador continua podendo editar o processo', async () => {
    comCargo(true)
    renderPage()
    await screen.findByText('PS Liga 2026.2')

    expect(screen.getByRole('button', { name: /editar processo/i })).toBeInTheDocument()
  })

  it('o avaliador lê que aquilo ali é a fila dele, não o processo inteiro', async () => {
    comCargo(false)
    renderPage()
    await screen.findByText('PS Liga 2026.2')

    expect(await screen.findByText(/você está aqui como avaliador/i)).toBeInTheDocument()
    // Os números do processo são do coordenador: a fila não é o total.
    expect(screen.queryByText('Inscritos')).not.toBeInTheDocument()
  })

  it('a aba pedida pelo endereço não dá a volta na regra', async () => {
    comCargo(false)
    renderWithProviders(
      <Routes>
        <Route path="/admin/processes/:id" element={<ManageProcessPage />} />
      </Routes>,
      { route: `/admin/processes/${process.id}?tab=organizers` },
    )
    await screen.findByText('PS Liga 2026.2')

    expect(
      screen.queryByText(/quem está neste processo/i),
    ).not.toBeInTheDocument()
    await waitFor(() => expect(listApplications).toHaveBeenCalled())
  })
})

describe('A ficha do candidato na correção anônima', () => {
  beforeEach(() => {
    vi.mocked(getApplication).mockResolvedValue(
      makeApplicationDetail({
        anonymous: true,
        participant_name: 'C-0007',
        email: null,
        phone: null,
        github: null,
        linkedin: null,
        bio: null,
        course: null,
        semester: null,
      }),
    )
    vi.mocked(getEvaluations).mockResolvedValue([])
  })

  it('diz que escondeu, em vez de mostrar campos vazios', async () => {
    renderWithProviders(
      <CandidateProfileModal
        applicationId="app-1"
        scaleMin={1}
        scaleMax={5}
        nextStageName={null}
        onClose={() => {}}
      />,
    )

    expect(await screen.findByText(/correção anônima nesta etapa/i)).toBeInTheDocument()
    expect(screen.queryByText('E-mail')).not.toBeInTheDocument()
    expect(screen.queryByText(/^curso:/i)).not.toBeInTheDocument()
  })

  it('e continua deixando o avaliador salvar a nota', async () => {
    renderWithProviders(
      <CandidateProfileModal
        applicationId="app-1"
        scaleMin={1}
        scaleMax={5}
        nextStageName={null}
        onClose={() => {}}
      />,
    )
    await screen.findByText(/correção anônima nesta etapa/i)

    // Dar nota é o trabalho dele: esconder a identidade não pode levar junto
    // o botão pelo qual ele existe na tela.
    expect(
      screen.getByRole('button', { name: /salvar avaliação/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /aprovar/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /reprovar/i }),
    ).not.toBeInTheDocument()
  })
})

describe('A lista de candidatos muda com o cargo', () => {
  beforeEach(() => {
    vi.mocked(listApplications).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [linha],
    })
  })

  it('o avaliador não seleciona candidato, porque não há ação em massa', async () => {
    renderWithProviders(<CandidatesTab process={process} canDecide={false} />)
    await screen.findByText('Ana Lima')

    expect(screen.queryByLabelText('Selecionar todos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Selecionar Ana Lima')).not.toBeInTheDocument()
  })

  it('fila vazia do avaliador explica que nada foi distribuído', async () => {
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    renderWithProviders(<CandidatesTab process={process} canDecide={false} />)

    expect(
      await screen.findByText(/nada distribuído para você ainda/i),
    ).toBeInTheDocument()
    // Mandar ajustar o filtro faria a pessoa procurar um filtro que ela nem mexeu.
    expect(screen.queryByText(/ajuste a busca/i)).not.toBeInTheDocument()
  })

  it('mas com filtro aplicado volta a falar de filtro', async () => {
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    renderWithProviders(<CandidatesTab process={process} canDecide={false} />)
    await screen.findByText(/nada distribuído para você ainda/i)

    await userEvent.type(
      screen.getByPlaceholderText(/pesquisar candidato/i),
      'ninguem',
    )

    expect(await screen.findByText(/ajuste a busca/i)).toBeInTheDocument()
  })

  it('a lista vazia do coordenador continua falando de filtro', async () => {
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    renderWithProviders(<CandidatesTab process={process} canDecide />)

    expect(await screen.findByText(/ajuste a busca/i)).toBeInTheDocument()
  })

  it('o coordenador continua selecionando', async () => {
    renderWithProviders(<CandidatesTab process={process} canDecide />)
    await screen.findByText('Ana Lima')

    expect(screen.getByLabelText('Selecionar todos')).toBeInTheDocument()
    expect(screen.getByLabelText('Selecionar Ana Lima')).toBeInTheDocument()
  })
})
